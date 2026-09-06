from app.ai.research.base import (
    MaintenanceResearchProvider,
)
from app.ai.schemas import (
    MaintenanceResearchResult,
    VehicleIdentity,
)


class OpenAIResearchProvider(
    MaintenanceResearchProvider
):
    async def research(
        self,
        identity: VehicleIdentity,
    ) -> MaintenanceResearchResult:
        raise NotImplementedError(
            "OpenAI research provider is not enabled yet."
        )