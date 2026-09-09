from abc import ABC, abstractmethod

from app.ai.schemas import (
    MaintenanceResearchResult,
    VehicleIdentity
)
from app.ai.search.schemas import SearchResult

class MaintenanceResearchProvider(ABC):
    @abstractmethod
    async def research(self, identity: VehicleIdentity, search_results: list[SearchResult]) -> MaintenanceResearchResult:
        raise NotImplementedError