import asyncio
import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
import math

from app.ai.research.factory import get_research_provider
from app.ai.research.knowledge_normalizer import KnowledgeNormalizer
from app.ai.research.source_validator import SourceValidator
from app.ai.schemas import (
    MaintenanceKnowledgeProfile,
    MaintenanceResearchResult,
    MaintenanceSummary,
    VehicleIdentity,
)
from app.ai.search.factory import get_maintenance_search_provider
from app.ai.vehicle_identity_key import create_vehicle_identity_key
from app.repositories.maintenance_knowledge_repository import (
    MaintenanceKnowledgeRepository,
)

logger = logging.getLogger(__name__)


class MaintenanceKnowledgeService:
    CACHE_TTL = timedelta(days=1)
    CACHE_SCHEMA_VERSION = 3
    RESEARCH_COOLDOWN = timedelta(seconds=60)
    TOTAL_TIMEOUT_SECONDS = 110
    _inflight: dict[str, asyncio.Task[MaintenanceKnowledgeProfile]] = {}
    _inflight_lock = asyncio.Lock()

    def __init__(
        self,
        repository: MaintenanceKnowledgeRepository | None = None,
        search_provider=None,
        research_provider=None,
    ):
        self.repository = repository or MaintenanceKnowledgeRepository()
        # Resolve external providers only after checking the cache. This keeps
        # valid cached guidance available during a temporary provider outage.
        self.search_provider = search_provider
        self.research_provider = research_provider
        self.source_validator = SourceValidator()
        self.knowledge_normalizer = KnowledgeNormalizer()

    async def get_maintenance_profile(
        self,
        user_id: str,
        vehicle_id: str,
        identity: VehicleIdentity,
        maintenance_summary: MaintenanceSummary,
        current_mileage: int,
    ) -> MaintenanceKnowledgeProfile:
        cache_key = self._cache_key(
            user_id, vehicle_id, identity, maintenance_summary, current_mileage,
        )
        cached_profile = await self.get_cached_profile(
            user_id, vehicle_id, identity, maintenance_summary, current_mileage,
        )
        if cached_profile is not None:
            return cached_profile

        async with self._inflight_lock:
            task = self._inflight.get(cache_key)
            if task is None:
                task = asyncio.create_task(
                    asyncio.wait_for(
                        self._research_and_cache(
                            user_id,
                            vehicle_id,
                            cache_key,
                            identity,
                            maintenance_summary,
                            current_mileage,
                        ),
                        timeout=self.TOTAL_TIMEOUT_SECONDS,
                    )
                )
                self._inflight[cache_key] = task
                task.add_done_callback(
                    lambda completed: self._clear_inflight(cache_key, completed)
                )

        return await asyncio.shield(task)

    async def get_cached_profile(
        self,
        user_id: str,
        vehicle_id: str,
        identity: VehicleIdentity,
        maintenance_summary: MaintenanceSummary,
        current_mileage: int,
    ) -> MaintenanceKnowledgeProfile | None:
        cache_key = self._cache_key(
            user_id, vehicle_id, identity, maintenance_summary, current_mileage,
        )
        cached = await self.repository.get_valid_profile(
            cache_key,
            datetime.now(timezone.utc),
            self.CACHE_SCHEMA_VERSION,
        )
        if cached is None:
            return None
        try:
            return MaintenanceKnowledgeProfile.model_validate(cached["profile"])
        except (KeyError, ValueError, TypeError):
            logger.warning("Ignoring an invalid cached maintenance profile")
            return None

    async def _research_and_cache(
        self,
        user_id: str,
        vehicle_id: str,
        cache_key: str,
        identity: VehicleIdentity,
        maintenance_summary: MaintenanceSummary,
        current_mileage: int,
    ) -> MaintenanceKnowledgeProfile:
        now = datetime.now(timezone.utc)
        cooldown_expiry = await self.repository.acquire_research_cooldown(
            user_id,
            vehicle_id,
            now,
            self.RESEARCH_COOLDOWN,
        )
        if cooldown_expiry is not None:
            retry_after = max(1, math.ceil((cooldown_expiry - now).total_seconds()))
            raise ResearchCooldownError(retry_after)

        search_provider = self.search_provider or get_maintenance_search_provider()
        research_provider = self.research_provider or get_research_provider()
        search_results = await search_provider.search(identity)
        research_result = await research_provider.research(
            identity=identity,
            search_results=search_results,
            maintenance_summary=maintenance_summary,
            current_mileage=current_mileage,
        )
        validated_result = self.source_validator.validate(
            identity=identity,
            research_result=research_result,
        )
        profile = self.knowledge_normalizer.normalize(
            identity=identity,
            research_result=validated_result,
        )

        now = datetime.now(timezone.utc)
        await self.repository.save_profile(
            cache_key=cache_key,
            profile=profile.model_dump(mode="json"),
            expires_at=now + self.CACHE_TTL,
            schema_version=self.CACHE_SCHEMA_VERSION,
        )
        return profile

    @staticmethod
    def _clear_inflight(
        cache_key: str,
        task: asyncio.Task[MaintenanceKnowledgeProfile],
    ) -> None:
        if not task.cancelled():
            task.exception()
        if MaintenanceKnowledgeService._inflight.get(cache_key) is task:
            MaintenanceKnowledgeService._inflight.pop(cache_key, None)

    @staticmethod
    def _cache_key(
        user_id: str,
        vehicle_id: str,
        identity: VehicleIdentity,
        summary: MaintenanceSummary,
        current_mileage: int,
    ) -> str:
        prompt_history = {
            "total_service_visits": summary.total_service_visits,
            "items": [
                {
                    "type": item.type,
                    "last_done_date": item.last_done_date.isoformat()
                    if item.last_done_date
                    else None,
                    "last_done_mileage": item.last_done_mileage,
                    "mileage_since_last_done": item.mileage_since_last_done,
                    "next_due_date": item.next_due_date.isoformat()
                    if item.next_due_date
                    else None,
                    "next_due_mileage": item.next_due_mileage,
                    "times_recorded": item.times_recorded,
                }
                for item in summary.maintenance_items
            ],
        }
        value = {
            "schema_version": MaintenanceKnowledgeService.CACHE_SCHEMA_VERSION,
            "user_id": user_id,
            "vehicle_id": vehicle_id,
            "identity": create_vehicle_identity_key(identity),
            "current_mileage": current_mileage,
            "history": prompt_history,
        }
        payload = json.dumps(value, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class ResearchCooldownError(Exception):
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__("AI maintenance research is temporarily rate limited.")
