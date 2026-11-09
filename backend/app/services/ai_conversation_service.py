import asyncio
import logging
import math
from datetime import datetime, timedelta, timezone
from uuid import UUID

from bson import ObjectId
from fastapi import HTTPException, status

from app.ai.context_builder import VehicleContextBuilder
from app.ai.maintenance_knowledge_service import MaintenanceKnowledgeService
from app.ai.research.gemini_provider import GeminiResearchProvider
from app.ai.research.source_validator import SourceValidator
from app.ai.schemas import (
    ChatAnswerDraft,
    ConversationAnswer,
    ConversationDetail,
    ConversationMaintenanceRecord,
    ConversationSource,
    ConversationSummary,
    ConversationTurn,
    MaintenanceResearchResult,
    ResearchSource,
    VehicleConversationContext,
)
from app.ai.search.factory import get_maintenance_search_provider
from app.ai.search.schemas import SearchResult
from app.repositories.ai_conversation_repository import AIConversationRepository

logger = logging.getLogger(__name__)


class AIConversationService:
    RETENTION = timedelta(days=90)
    TOTAL_TIMEOUT_SECONDS = 110
    MAX_DAILY_ANSWERS = 20
    VEHICLE_COOLDOWN_SECONDS = 10
    HISTORY_EXCHANGES = 8

    def __init__(
        self,
        repository: AIConversationRepository | None = None,
        context_builder: VehicleContextBuilder | None = None,
        gemini_provider: GeminiResearchProvider | None = None,
        search_provider=None,
        knowledge_service: MaintenanceKnowledgeService | None = None,
    ):
        self.repository = repository or AIConversationRepository()
        self.context_builder = context_builder or VehicleContextBuilder()
        self.gemini_provider = gemini_provider
        self.search_provider = search_provider
        self.knowledge_service = knowledge_service or MaintenanceKnowledgeService()
        self.source_validator = SourceValidator()

    async def create(self, vehicle_id: str, user_id: str) -> ConversationSummary:
        owned_vehicle_id = await self.context_builder.verify_vehicle_access(vehicle_id, user_id)
        now = datetime.now(timezone.utc)
        document = await self.repository.create_conversation({
            "user_id": user_id,
            "vehicle_id": owned_vehicle_id,
            "title": "New conversation",
            "created_at": now,
            "updated_at": now,
            "expires_at": now + self.RETENTION,
            "turn_count": 0,
        })
        return self._conversation_summary(document)

    async def list_for_vehicle(self, vehicle_id: str, user_id: str) -> list[ConversationSummary]:
        owned_vehicle_id = await self.context_builder.verify_vehicle_access(vehicle_id, user_id)
        now = datetime.now(timezone.utc)
        conversations = await self.repository.list_conversations(user_id, owned_vehicle_id)
        return [
            self._conversation_summary(item)
            for item in conversations
            if self._as_utc_datetime(item.get("expires_at", now)) > now
        ]

    async def get(self, vehicle_id: str, conversation_id: str, user_id: str) -> ConversationDetail:
        owned_vehicle_id = await self.context_builder.verify_vehicle_access(vehicle_id, user_id)
        conversation = await self._get_owned_conversation(conversation_id, user_id, owned_vehicle_id)
        turn_docs = await self.repository.get_turns(conversation["_id"])
        turns = [self._conversation_turn(item) for item in turn_docs if item.get("status") == "complete"]
        return ConversationDetail(**self._conversation_summary(conversation).model_dump(), turns=turns)

    async def delete(self, vehicle_id: str, conversation_id: str, user_id: str) -> None:
        owned_vehicle_id = await self.context_builder.verify_vehicle_access(vehicle_id, user_id)
        conversation = await self._get_owned_conversation(conversation_id, user_id, owned_vehicle_id)
        await self.repository.delete_conversation(conversation["_id"], user_id, owned_vehicle_id)

    async def send_message(
        self,
        vehicle_id: str,
        conversation_id: str,
        user_id: str,
        client_message_id: UUID,
        question: str,
    ) -> ConversationTurn:
        context = await self.context_builder.build_conversation_context(vehicle_id, user_id)
        conversation = await self._get_owned_conversation(conversation_id, user_id, context.vehicle.id)
        now = datetime.now(timezone.utc)
        expires_at = now + self.RETENTION
        turn_id = ObjectId()
        turn, is_new = await self.repository.reserve_turn(
            conversation,
            str(client_message_id),
            question.strip(),
            turn_id,
            now,
            expires_at,
        )
        if turn is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This conversation has reached its {self.repository.MAX_TURNS}-message limit or has expired. Start a new conversation.",
            )
        if not is_new:
            if turn.get("question") != question.strip():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This message identifier was already used for a different question.",
                )
            if turn.get("status") == "complete":
                return self._conversation_turn(turn)
            if turn.get("status") == "processing":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This message is already being processed. Please wait before retrying.",
                )
            turn, claimed = await self.repository.retry_failed_turn(turn, now, expires_at)
            if not claimed:
                if turn.get("status") == "complete":
                    return self._conversation_turn(turn)
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This message is already being processed. Please wait before retrying.",
                )

        today = now.astimezone(timezone.utc).date().isoformat()
        try:
            if not await self.repository.acquire_daily_slot(
                user_id, today, now, self.MAX_DAILY_ANSWERS
            ):
                retry_after = int((datetime.combine(
                    now.astimezone(timezone.utc).date() + timedelta(days=1),
                    datetime.min.time(),
                    tzinfo=timezone.utc,
                ) - now).total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Daily AI assistant limit reached. Try again after the UTC day resets.",
                    headers={"Retry-After": str(max(1, retry_after))},
                )
            cooldown_expiry = await self.repository.acquire_vehicle_cooldown(
                user_id, context.vehicle.id, now, self.VEHICLE_COOLDOWN_SECONDS
            )
            if cooldown_expiry is not None:
                await self.repository.release_daily_slot(user_id, today)
                retry_after = max(1, math.ceil((cooldown_expiry - now).total_seconds()))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Please wait before sending another assistant question for this vehicle.",
                    headers={"Retry-After": str(retry_after)},
                )

            answer = await asyncio.wait_for(
                self._answer_question(context, conversation, turn, question.strip()),
                timeout=self.TOTAL_TIMEOUT_SECONDS,
            )
            await self.repository.complete_turn(turn["_id"], answer.model_dump(mode="json"))
            title = question.strip().splitlines()[0][:80]
            completed_at = datetime.now(timezone.utc)
            await self.repository.refresh_conversation(
                conversation, completed_at, completed_at + self.RETENTION, title
            )
            completed = dict(turn)
            completed.update({"answer": answer.model_dump(mode="json"), "status": "complete"})
            return self._conversation_turn(completed)
        except HTTPException:
            await self.repository.mark_turn_failed(turn["_id"])
            raise
        except Exception as exc:
            await self.repository.mark_turn_failed(turn["_id"])
            logger.warning("Vehicle assistant request failed for vehicle %s (%s)", context.vehicle.id, type(exc).__name__)
            raise

    async def _answer_question(
        self,
        context: VehicleConversationContext,
        conversation: dict,
        current_turn: dict,
        question: str,
    ) -> ConversationAnswer:
        provider = self.gemini_provider or GeminiResearchProvider()
        history_docs = await self.repository.get_recent_turns(
            conversation["_id"], self.HISTORY_EXCHANGES
        )
        history = [
            {"question": item["question"], "answer": item["answer"]}
            for item in history_docs
            if item.get("_id") != current_turn.get("_id")
        ][-self.HISTORY_EXCHANGES:]
        valid_profile = await self.knowledge_service.get_cached_profile(
            user_id=conversation["user_id"],
            vehicle_id=context.vehicle.id,
            identity=context.vehicle.identity,
            maintenance_summary=context.maintenance_summary,
            current_mileage=context.vehicle.current_mileage,
        )
        payload = self._context_payload(context, valid_profile)
        route = await provider.route_conversation(question, payload, history)

        if not route.needs_research:
            draft = route.direct_answer
            if draft is None:
                return self._empty_answer(context, "The assistant could not form a safe answer from saved records.")
            cached_results = self._cached_search_results(valid_profile)
            return self._validate_draft(draft, context, cached_results, valid_profile)

        search_results: list[SearchResult] = []
        evidence_unavailable = False
        try:
            search_provider = self.search_provider or get_maintenance_search_provider()
            search_results = await search_provider.search_questions(
                context.vehicle.identity, route.search_queries[:3]
            )
        except Exception as exc:
            evidence_unavailable = True
            logger.warning("Vehicle assistant search unavailable (%s)", type(exc).__name__)

        cached_results = self._cached_search_results(valid_profile)
        candidates = [*search_results, *cached_results]
        if not search_results and not cached_results:
            evidence_unavailable = True
        draft = await provider.answer_conversation(
            question,
            payload,
            history,
            candidates,
            evidence_unavailable=evidence_unavailable,
        )
        return self._validate_draft(draft, context, candidates, valid_profile)

    @staticmethod
    def _context_payload(context: VehicleConversationContext, valid_profile) -> dict:
        vehicle = context.vehicle
        payload = {
            "vehicle": {
                "manufacturer": vehicle.manufacturer,
                "model": vehicle.model,
                "variant": vehicle.variant,
                "year": vehicle.year,
                "engine": vehicle.engine,
                "transmission": vehicle.transmission,
                "fuel_type": vehicle.fuel_type,
                "current_mileage_km": vehicle.current_mileage,
            },
            "maintenance_records": [item.model_dump(mode="json") for item in context.maintenance_records],
            "history_truncated": context.history_truncated,
        }
        if valid_profile is not None:
            payload["previous_validated_research"] = {
                "guidance": [
                    {
                        "name": item.name[:160],
                        "recommendation_type": item.recommendation_type.value,
                        "description": item.description[:500] if item.description else None,
                        "reason": item.reason[:500] if item.reason else None,
                        "confidence": item.confidence.value,
                        "sources": [
                            {
                                "name": source.name[:120],
                                "title": source.title[:200] if source.title else None,
                                "url": AIConversationService._canonical_url(source.url),
                                "source_type": source.source_type.value,
                            }
                            for source in item.sources
                            if AIConversationService._canonical_url(source.url)
                            and len(AIConversationService._canonical_url(source.url)) <= 500
                        ][:2],
                    }
                    for item in valid_profile.guidance[:5]
                ],
            }
        return payload

    @staticmethod
    def _cached_search_results(valid_profile) -> list[SearchResult]:
        if valid_profile is None:
            return []
        results = []
        for item in valid_profile.guidance[:5]:
            evidence = " ".join(value for value in [item.name, item.description, item.reason] if value)
            for source in item.sources[:2]:
                canonical_url = AIConversationService._canonical_url(source.url)
                if not canonical_url or len(canonical_url) > 500:
                    continue
                try:
                    results.append(SearchResult(
                        title=source.title or source.name,
                        url=canonical_url,
                        content=evidence[:2_500],
                        score=1.0,
                    ))
                except Exception:
                    continue
        unique = {str(item.url): item for item in results}
        return list(unique.values())[:10]

    def _validate_draft(
        self,
        draft: ChatAnswerDraft,
        context: VehicleConversationContext,
        candidates: list[SearchResult],
        valid_profile,
    ) -> ConversationAnswer:
        records = {item.reference: item for item in context.maintenance_records}
        recorded_information = [
            records[reference]
            for reference in dict.fromkeys(draft.record_references)
            if reference in records
        ]
        candidate_by_url = {str(item.url): item for item in candidates}
        cached_sources = {
            self._canonical_url(source.url): source
            for guidance in (valid_profile.guidance if valid_profile else [])
            for source in guidance.sources
            if self._canonical_url(source.url)
        }
        requested_urls = {str(source.url) for source in draft.sources}
        accepted: dict[str, ConversationSource] = {}
        for url in requested_urls:
            if url not in cached_sources or url not in candidate_by_url:
                continue
            cached = cached_sources[url]
            accepted[url] = ConversationSource(
                url=url,
                title=cached.title or cached.name,
                name=cached.name,
                source_type=cached.source_type,
            )
        model_sources = [
            source for source in draft.sources
            if str(source.url) in candidate_by_url and str(source.url) not in cached_sources
        ]
        validation = self.source_validator.validate(
            context.vehicle.identity,
            MaintenanceResearchResult(guidance=[], sources=model_sources),
        )
        for source in validation.sources:
            url = str(source.url)
            result = candidate_by_url.get(url)
            if result is None:
                continue
            source_type = source.source_type
            title = result.title[:300]
            name = result.url.host if getattr(result.url, "host", None) else "Verified source"
            accepted[url] = ConversationSource(
                url=url,
                title=title,
                name=name,
                source_type=source_type,
            )
        claims = []
        for claim in draft.researched_claims:
            urls = [url for url in dict.fromkeys(claim.source_urls) if url in accepted]
            if urls:
                claims.append(claim.model_copy(update={"source_urls": urls}))
        claims_rejected = len(claims) < len(draft.researched_claims)
        cited_urls = {url for claim in claims for url in claim.source_urls}
        sources = [accepted[url] for url in sorted(cited_urls)]
        limitations = list(dict.fromkeys(draft.limitations))
        if context.history_truncated:
            limitations.append("Only the most recent 60 recorded maintenance items were considered; older records may not be represented.")
        if draft.researched_claims and not claims:
            limitations.append("No external claims passed source and vehicle checks.")
        interpretation = draft.interpretation
        if claims_rejected or (not recorded_information and not claims):
            interpretation = None
            if not recorded_information and not claims:
                limitations.append("There were no matching saved records or validated external claims to support a detailed answer. Missing records do not prove that work was never completed.")
        return ConversationAnswer(
            recorded_information=recorded_information,
            researched_claims=claims,
            sources=sources,
            interpretation=interpretation,
            limitations=list(dict.fromkeys(limitations))[-5:],
        )

    @staticmethod
    def _canonical_url(url: str) -> str | None:
        try:
            return str(SearchResult(title="cached research", url=url).url)
        except Exception:
            return None

    @staticmethod
    def _empty_answer(context: VehicleConversationContext, limitation: str) -> ConversationAnswer:
        limitations = [limitation]
        if context.history_truncated:
            limitations.append("Only the most recent 60 recorded maintenance items were considered.")
        return ConversationAnswer(limitations=limitations)

    @staticmethod
    def _as_utc_datetime(value: datetime) -> datetime:
        # PyMongo returns BSON datetimes as naive UTC unless tz_aware is enabled.
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    async def _get_owned_conversation(self, conversation_id: str, user_id: str, vehicle_id: str) -> dict:
        try:
            object_id = ObjectId(conversation_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail="Conversation not found.") from exc
        conversation = await self.repository.get_conversation(object_id, user_id, vehicle_id)
        if conversation is None or self._as_utc_datetime(
            conversation.get("expires_at", datetime.min.replace(tzinfo=timezone.utc))
        ) <= datetime.now(timezone.utc):
            raise HTTPException(status_code=404, detail="Conversation not found.")
        return conversation

    @staticmethod
    def _conversation_summary(document: dict) -> ConversationSummary:
        return ConversationSummary(
            id=str(document["_id"]),
            vehicle_id=str(document["vehicle_id"]),
            title=document.get("title", "New conversation"),
            created_at=AIConversationService._as_utc_datetime(document["created_at"]),
            updated_at=AIConversationService._as_utc_datetime(document["updated_at"]),
            expires_at=AIConversationService._as_utc_datetime(document["expires_at"]),
            turn_count=document.get("turn_count", 0),
        )

    @staticmethod
    def _conversation_turn(document: dict) -> ConversationTurn:
        return ConversationTurn(
            id=str(document["_id"]),
            client_message_id=document["client_message_id"],
            question=document["question"],
            answer=document.get("answer"),
            status=document.get("status", "complete"),
            created_at=AIConversationService._as_utc_datetime(document["created_at"]),
        )
