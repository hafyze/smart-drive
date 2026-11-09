from abc import ABC, abstractmethod

from app.ai.schemas import (
    MaintenanceSummary,
    MaintenanceResearchResult,
    VehicleIdentity
)
from app.ai.search.schemas import SearchResult

class MaintenanceResearchProvider(ABC):
    @abstractmethod
    async def research(
        self,
        identity: VehicleIdentity,
        search_results: list[SearchResult],
        maintenance_summary: MaintenanceSummary,
        current_mileage: int,
    ) -> MaintenanceResearchResult:
        raise NotImplementedError
