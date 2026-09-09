from abc import ABC, abstractmethod

from app.ai.schemas import VehicleIdentity
from app.ai.search.schemas import SearchResult

class MaintenanceSearchProvider(ABC):
    @abstractmethod
    async def search(self, identity: VehicleIdentity) -> list[SearchResult]:
        raise NotImplementedError