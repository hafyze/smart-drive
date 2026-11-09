import unittest
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch
from uuid import UUID, uuid4

from bson import ObjectId
from fastapi import HTTPException, status

from app.ai.schemas import (
    ChatAnswerDraft,
    ChatResearchClaim,
    ChatRouteDraft,
    ConversationMaintenanceRecord,
    MaintenanceKnowledgeProfile,
    MaintenanceGuidanceItem,
    MaintenanceRecommendationType,
    MaintenanceSourceType,
    MaintenanceSummary,
    ResearchSource,
    ResearchedVehicleMatch,
    VehicleContext,
    VehicleConversationContext,
    VehicleIdentity,
    VehicleIdentityConfidence,
)
from app.ai.search.schemas import SearchResult
from app.routes.ai import router
from app.dependencies.auth_dependencies import get_current_user
from app.services.ai_conversation_service import AIConversationService


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("Conversation coroutine unexpectedly waited for I/O")


class FakeRepository:
    def __init__(self, conversation=None, existing_turn=None, daily_slot=True, cooldown=None):
        self.conversation = conversation or {
            "_id": ObjectId(),
            "user_id": "owner-1",
            "vehicle_id": "vehicle-1",
            "title": "New conversation",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=90),
            "turn_count": 0,
        }
        self.existing_turn = existing_turn
        self.daily_slot = daily_slot
        self.cooldown = cooldown
        self.saved_turn = None
        self.failed_turn = False
        self.refreshed = False

    async def get_conversation(self, conversation_id, user_id, vehicle_id):
        if str(conversation_id) == str(self.conversation["_id"]) and user_id == self.conversation["user_id"] and vehicle_id == self.conversation["vehicle_id"]:
            return self.conversation
        return None

    async def list_conversations(self, user_id, vehicle_id):
        if user_id == self.conversation["user_id"] and vehicle_id == self.conversation["vehicle_id"]:
            return [self.conversation]
        return []

    async def reserve_turn(self, conversation, client_message_id, question, turn_id, now, expires_at):
        if self.existing_turn is not None:
            return self.existing_turn, False
        self.saved_turn = {
            "_id": turn_id,
            "client_message_id": client_message_id,
            "question": question,
            "answer": None,
            "status": "processing",
            "created_at": now,
        }
        return self.saved_turn, True

    async def retry_failed_turn(self, turn, now, expires_at):
        turn["status"] = "processing"
        turn["created_at"] = now
        return turn, True

    async def acquire_daily_slot(self, *args):
        return self.daily_slot

    async def release_daily_slot(self, *args):
        return None

    async def acquire_vehicle_cooldown(self, *args):
        return self.cooldown

    async def get_recent_turns(self, *args):
        return []

    async def complete_turn(self, turn_id, answer):
        self.saved_turn.update({"answer": answer, "status": "complete"})

    async def mark_turn_failed(self, turn_id):
        self.failed_turn = True

    async def refresh_conversation(self, *args):
        self.refreshed = True


class FakeContextBuilder:
    def __init__(self, context=None, error=None):
        self.context = context
        self.error = error

    async def build_conversation_context(self, vehicle_id, user_id):
        if self.error:
            raise self.error
        return self.context

    async def verify_vehicle_access(self, vehicle_id, user_id):
        if self.error:
            raise self.error
        return "vehicle-1"


class FakeKnowledge:
    async def get_cached_profile(self, **kwargs):
        return None


class AIConversationTests(unittest.TestCase):
    def setUp(self):
        self.identity = VehicleIdentity(
            manufacturer="Perodua", model="Myvi", variant="1.5 AV", year=2023,
            transmission="AUTOMATIC", confidence=VehicleIdentityConfidence.HIGH,
        )
        self.record = ConversationMaintenanceRecord(
            reference="visit-1:0", service_date=date(2026, 6, 1), mileage_at_service=55_000,
            type="BRAKE_SERVICE", description="Replaced brake pads", next_due_mileage=70_000,
        )
        self.context = VehicleConversationContext(
            vehicle=VehicleContext(
                id="vehicle-1", manufacturer="Perodua", model="Myvi", variant="1.5 AV",
                year=2023, current_mileage=60_000, engine="1.5L", fuel_type="PETROL",
                transmission="AUTOMATIC", identity=self.identity,
            ),
            maintenance_summary=MaintenanceSummary(),
            maintenance_records=[self.record],
        )

    def _service(self, provider, search_provider=None, repo=None, context_builder=None, daily_slot=True, cooldown=None):
        repository = repo or FakeRepository(daily_slot=daily_slot, cooldown=cooldown)
        service = AIConversationService(
            repository=repository,
            context_builder=context_builder or FakeContextBuilder(self.context),
            gemini_provider=provider,
            search_provider=search_provider,
            knowledge_service=FakeKnowledge(),
        )
        return service, repository

    @staticmethod
    def _inline_wait_for(awaitable, timeout):
        return run_immediate_coroutine(awaitable)

    def test_naive_mongo_conversation_dates_are_normalized_as_utc(self):
        repository = FakeRepository()
        for field in ("created_at", "updated_at", "expires_at"):
            repository.conversation[field] = repository.conversation[field].replace(tzinfo=None)
        service, _ = self._service(provider=None, repo=repository)

        conversation = run_immediate_coroutine(service._get_owned_conversation(
            str(repository.conversation["_id"]), "owner-1", "vehicle-1",
        ))
        summary = service._conversation_summary(conversation)
        listed = run_immediate_coroutine(service.list_for_vehicle("vehicle-1", "owner-1"))

        self.assertEqual(summary.created_at.tzinfo, timezone.utc)
        self.assertEqual(summary.updated_at.tzinfo, timezone.utc)
        self.assertEqual(summary.expires_at.tzinfo, timezone.utc)
        self.assertEqual(len(listed), 1)

    def test_record_only_questions_do_not_search_and_filter_unknown_record_references(self):
        class Provider:
            async def route_conversation(self, question, context, history):
                self.context = context
                return ChatRouteDraft(needs_research=False, direct_answer=ChatAnswerDraft(
                    record_references=["visit-1:0", "invented"],
                    interpretation="Your records show one brake-pad replacement.",
                ))

        class Search:
            async def search_questions(self, *args):
                raise AssertionError("Record-only questions must not search the web")

        provider = Provider()
        service, repository = self._service(provider, Search())
        with patch("app.services.ai_conversation_service.asyncio.wait_for", side_effect=self._inline_wait_for):
            result = run_immediate_coroutine(service.send_message(
                "vehicle-1", str(repository.conversation["_id"]), "owner-1", uuid4(),
                "Have I recorded brake service?",
            ))
        self.assertEqual([item.reference for item in result.answer.recorded_information], ["visit-1:0"])
        self.assertEqual(result.answer.researched_claims, [])
        self.assertEqual(provider.context["vehicle"]["engine"], "1.5L")
        self.assertNotIn("cost", str(provider.context).lower())
        self.assertTrue(repository.refreshed)

    def test_external_claims_keep_only_allowed_sources_that_match_vehicle(self):
        source_url = "https://www.paultan.org/myvi-guide"
        untrusted_url = "https://example.invalid/article"
        draft = ChatAnswerDraft(
            researched_claims=[
                ChatResearchClaim(claim="The source discusses this model.", source_urls=[source_url, untrusted_url]),
                ChatResearchClaim(claim="Unsupported source claim.", source_urls=[untrusted_url]),
            ],
            sources=[
                ResearchSource(
                    name="Model supplied", url=source_url, source_type=MaintenanceSourceType.SPECIALIST,
                    vehicle_match=ResearchedVehicleMatch(manufacturer="Perodua", model="Myvi"),
                ),
                ResearchSource(
                    name="Wrong model", url="https://www.wapcar.my/axia-guide", source_type=MaintenanceSourceType.SPECIALIST,
                    vehicle_match=ResearchedVehicleMatch(manufacturer="Perodua", model="Axia"),
                ),
            ],
        )
        service, _ = self._service(provider=None)
        candidates = [
            SearchResult(title="Verified guide", url=source_url, content="Evidence"),
            SearchResult(title="Other model", url="https://www.wapcar.my/axia-guide", content="Evidence"),
        ]
        answer = service._validate_draft(draft, self.context, candidates, None)
        self.assertEqual(answer.researched_claims[0].source_urls, [source_url])
        self.assertEqual(len(answer.researched_claims), 1)
        self.assertEqual(answer.sources[0].title, "Verified guide")

    def test_current_cached_research_can_be_cited_without_researching_again(self):
        source_url = "https://www.paultan.org/myvi-guide"
        profile = MaintenanceKnowledgeProfile(
            manufacturer="Perodua", model="Myvi", year=2023, transmission="AUTOMATIC",
            vehicle_match_confidence=VehicleIdentityConfidence.HIGH,
            guidance=[MaintenanceGuidanceItem(
                key="engine oil", name="Engine oil", recommendation_type=MaintenanceRecommendationType.PREVENTIVE,
                confidence="HIGH", sources=[{
                    "name": "www.paultan.org", "url": source_url,
                    "source_type": MaintenanceSourceType.SPECIALIST, "title": "Validated maintenance guide",
                }],
            )],
            generated_at=datetime.now(timezone.utc),
        )
        service, _ = self._service(provider=None)
        draft = ChatAnswerDraft(
            researched_claims=[ChatResearchClaim(claim="A cached source has relevant advice.", source_urls=[source_url])],
            sources=[ResearchSource(name="Cached guide", url=source_url, source_type=MaintenanceSourceType.SPECIALIST)],
        )
        answer = service._validate_draft(draft, self.context, service._cached_search_results(profile), profile)
        self.assertEqual(answer.researched_claims[0].source_urls, [source_url])
        self.assertEqual(answer.sources[0].title, "Validated maintenance guide")

    def test_unsupported_interpretation_is_removed_when_no_records_or_citations_support_it(self):
        service, _ = self._service(provider=None)
        answer = service._validate_draft(
            ChatAnswerDraft(interpretation="This engine is known to fail at this mileage."),
            self.context,
            [],
            None,
        )
        self.assertIsNone(answer.interpretation)
        self.assertEqual(answer.researched_claims, [])
        self.assertTrue(any("Missing records do not prove" in item for item in answer.limitations))

    def test_search_is_used_only_when_gemini_routes_to_external_research(self):
        class Provider:
            async def route_conversation(self, question, context, history):
                return ChatRouteDraft(needs_research=True, search_queries=["Myvi brake maintenance"])

            async def answer_conversation(self, question, context, history, search_results, evidence_unavailable=False):
                self.results = search_results
                self.unavailable = evidence_unavailable
                return ChatAnswerDraft(limitations=["Evidence not sufficient."])

        class Search:
            async def search_questions(self, identity, queries):
                self.queries = queries
                return []

        provider, search = Provider(), Search()
        service, repository = self._service(provider, search)
        with patch("app.services.ai_conversation_service.asyncio.wait_for", side_effect=self._inline_wait_for):
            result = run_immediate_coroutine(service.send_message(
                "vehicle-1", str(repository.conversation["_id"]), "owner-1", uuid4(),
                "What are known brake concerns for this model?",
            ))
        self.assertEqual(search.queries, ["Myvi brake maintenance"])
        self.assertTrue(provider.unavailable)
        self.assertIn("Evidence not sufficient.", result.answer.limitations)

    def test_provider_quota_is_enforced_before_model_or_search_calls(self):
        class NeverCalled:
            async def route_conversation(self, *args):
                raise AssertionError("Provider must not run after quota exhaustion")

        service, repository = self._service(NeverCalled(), daily_slot=False)
        with patch("app.services.ai_conversation_service.asyncio.wait_for", side_effect=self._inline_wait_for):
            with self.assertRaises(HTTPException) as caught:
                run_immediate_coroutine(service.send_message(
                    "vehicle-1", str(repository.conversation["_id"]), "owner-1", uuid4(), "question",
                ))
        self.assertEqual(caught.exception.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertTrue(repository.failed_turn)

    def test_usage_storage_failure_fails_closed_before_provider_call(self):
        class BrokenRepository(FakeRepository):
            async def acquire_daily_slot(self, *args):
                raise RuntimeError("storage unavailable")

        class NeverCalled:
            async def route_conversation(self, *args):
                raise AssertionError("Provider must not run when usage storage fails")

        repository = BrokenRepository()
        service, _ = self._service(NeverCalled(), repo=repository)
        with patch("app.services.ai_conversation_service.asyncio.wait_for", side_effect=self._inline_wait_for):
            with self.assertRaises(RuntimeError):
                run_immediate_coroutine(service.send_message(
                    "vehicle-1", str(repository.conversation["_id"]), "owner-1", uuid4(), "question",
                ))
        self.assertTrue(repository.failed_turn)

    def test_total_chat_deadline_is_110_seconds(self):
        class Provider:
            async def route_conversation(self, question, context, history):
                return ChatRouteDraft(needs_research=False, direct_answer=ChatAnswerDraft(interpretation="Saved record answer."))

        timeouts = []

        async def inline_wait_for(awaitable, timeout):
            timeouts.append(timeout)
            return run_immediate_coroutine(awaitable)

        service, repository = self._service(Provider())
        with patch("app.services.ai_conversation_service.asyncio.wait_for", side_effect=inline_wait_for):
            run_immediate_coroutine(service.send_message(
                "vehicle-1", str(repository.conversation["_id"]), "owner-1", uuid4(), "question",
            ))
        self.assertEqual(timeouts, [110])

    def test_vehicle_cooldown_releases_daily_slot_and_blocks_provider(self):
        class NeverCalled:
            async def route_conversation(self, *args):
                raise AssertionError("Provider must not run during cooldown")

        expiry = datetime.now(timezone.utc) + timedelta(seconds=6)
        service, repository = self._service(NeverCalled(), cooldown=expiry)
        with patch("app.services.ai_conversation_service.asyncio.wait_for", side_effect=self._inline_wait_for):
            with self.assertRaises(HTTPException) as caught:
                run_immediate_coroutine(service.send_message(
                    "vehicle-1", str(repository.conversation["_id"]), "owner-1", uuid4(), "question",
                ))
        self.assertEqual(caught.exception.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertTrue(repository.failed_turn)

    def test_conversation_lookup_is_scoped_to_owner_and_vehicle(self):
        service, _ = self._service(provider=None)
        with self.assertRaises(HTTPException) as caught:
            run_immediate_coroutine(service.get("vehicle-1", str(ObjectId()), "other-user"))
        self.assertEqual(caught.exception.status_code, status.HTTP_404_NOT_FOUND)

    def test_idempotent_completed_request_returns_stored_response_without_provider_call(self):
        now = datetime.now(timezone.utc)
        existing = {
            "_id": ObjectId(), "client_message_id": str(uuid4()),
            "question": "same question", "answer": {"recorded_information": [], "researched_claims": [], "sources": [], "interpretation": "Saved answer", "limitations": []},
            "status": "complete", "created_at": now,
        }
        service, repository = self._service(provider=None, repo=FakeRepository(existing_turn=existing))
        with patch("app.services.ai_conversation_service.asyncio.wait_for", side_effect=self._inline_wait_for):
            result = run_immediate_coroutine(service.send_message(
                "vehicle-1", str(repository.conversation["_id"]), "owner-1", UUID(existing["client_message_id"]), "same question",
            ))
        self.assertEqual(result.answer.interpretation, "Saved answer")

    def test_vehicle_authorization_failure_stops_before_provider(self):
        service, _ = self._service(
            provider=None,
            context_builder=FakeContextBuilder(error=HTTPException(status_code=403, detail="Access denied.")),
        )
        with self.assertRaises(HTTPException):
            run_immediate_coroutine(service.create("other-vehicle", "owner-1"))

    def test_conversation_routes_require_authenticated_user(self):
        routes = [route for route in router.routes if "/conversations" in getattr(route, "path", "")]
        self.assertEqual(len(routes), 5)
        for route in routes:
            self.assertIn(get_current_user, [dependency.call for dependency in route.dependant.dependencies])


if __name__ == "__main__":
    unittest.main()
