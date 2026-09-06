from datetime import datetime, timezone

from app.ai.schemas import (
    MaintenanceKnowledgeProfile,
    VehicleIdentity
)
from app.ai.vehicle_identity_key import (
    create_vehicle_identity_key,
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

    async def get_maintenance_profile(self, identity: VehicleIdentity) -> MaintenanceKnowledgeProfile:
        profile = await self._get_cached_profile(identity)

        if profile is not None:
            return profile

        profile = await self._research_vehicle(identity)

        await self._cache_profile(profile)

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