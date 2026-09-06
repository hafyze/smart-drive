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

from app.ai.research.knowledge_normalizer import (
    KnowledgeNormalizer,
)

from app.ai.research.source_validator import (
    SourceValidator,
)

class MaintenanceKnowledgeService:
    def __init__(self):
        self.repository = (MaintenanceKnowledgeRepository())

        self.research_provider = (get_research_provider())
        self.source_validator = (SourceValidator())
        self.knowledge_normalizer = (KnowledgeNormalizer())

    def _build_knowledge_profile(
        self,
        identity: VehicleIdentity,
        research_result: MaintenanceResearchResult,
    ) -> MaintenanceKnowledgeProfile:
        validated_result = (
            self.source_validator.validate(
                identity=identity,
                research_result=research_result
            )
        )

        return (
            self.knowledge_normalizer.normalize(
                identity=identity,
                research_result=validated_result
            )
        )

    async def _research_vehicle(self, identity: VehicleIdentity) -> MaintenanceResearchResult:
        return await self.research_provider.research(identity)

    async def get_maintenance_profile(self, identity: VehicleIdentity) -> MaintenanceKnowledgeProfile:
        cached_profile = await self._get_cached_profile(identity)

        if cached_profile is not None:
            return cached_profile

        research_result = await self._research_vehicle(identity)

        profile = self._build_knowledge_profile(
            identity=identity,
            research_result=research_result,
        )

        await self._cache_profile(identity, profile)

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

    async def _cache_profile(self, identity: VehicleIdentity, profile: MaintenanceKnowledgeProfile) -> None:
        document = profile.model_dump()
        document["identity_key"] = (
            create_vehicle_identity_key(identity)
        )

        await self.repository.insert(document)