from abc import ABC, abstractclassmethod

from app.ai.schemas import (
    MaintenanceResearchResult,
    VehicleIdentity
)

class MaintenanceResearchProvider(ABC):
    @abstractclassmethod
    async def research(self, identity: VehicleIdentity) -> MaintenanceResearchResult:
        pass