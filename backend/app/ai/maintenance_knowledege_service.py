from datetime import datetime, timezone

from app.ai.schemas import (
    MaintenanceKnowledgeProfile,
    MaintenanceResearchResult,
    VehicleIdentity
)
from app.ai.vehicle_identity_key import (
    create_vehicle_identity_key,
)
from app.ai.research.factory import (
    get_research_provider,
)
from app.repositories.maintenance_knowledge_repository import (
    MaintenanceKnowledgeRepository,
)
from app.shared.utils.serialization import (
    serialize_document,
)
class MaintenanceKnowledgeService:
    def __init__(self):
        self.repository = (MaintenanceKnowledgeRepository())

        self.research_provider = (get_research_provider())

    def _build_knowledge_profile(
        self,
        identity: VehicleIdentity,
        research_result: MaintenanceResearchResult,
    ) -> MaintenanceKnowledgeProfile:
        raise NotImplementedError(
            "Research validation and normalization are not implemented yet."
        )

    async def _research_vehicle(self, identity: VehicleIdentity) -> MaintenanceResearchResult:
        return await self.research_provider.research(identity)

    async def get_maintenance_profile(self, identity: VehicleIdentity) -> MaintenanceKnowledgeProfile:
        cached_profile = await self._get_cached_profile(
            identity
        )

        if cached_profile is not None:
            return cached_profile

        research_result = await self._research_vehicle(
            identity
        )

        profile = self._build_knowledge_profile(
            identity=identity,
            research_result=research_result,
        )

        await self._cache_profile(
            profile
        )

        return profile

    async def _get_cached_profile(self, identity: VehicleIdentity) -> MaintenanceKnowledgeProfile|None:
        identity_key = (
            create_vehicle_identity_key(identity)
        )

        document = await self.repository.find_one(
            {
                "identity_key": identity_key
            }
        )
        if document is None:
            return None
        
        return MaintenanceKnowledgeProfile.model_validate(
            serialize_document(document)
        )

    async def _cache_profile(self, profile: MaintenanceKnowledgeProfile) -> None:
        pass