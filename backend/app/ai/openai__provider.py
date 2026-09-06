from openai import AsyncOpenAI

from app.ai.research.base import (
    MaintenanceResearchProvider,
)
from app.ai.research.prompts import (
    RESEARCH_INSTRUCTIONS,
)
from app.ai.schemas import (
    MaintenanceKnowledgeProfile,
    VehicleIdentity,
)
from app.core.config import settings


class OpenAIResearchProvider(
    MaintenanceResearchProvider
):
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key
        )

    async def research(
        self,
        identity: VehicleIdentity,
    ) -> MaintenanceKnowledgeProfile:

        vehicle_description = (
            f"{identity.year} "
            f"{identity.manufacturer} "
            f"{identity.model} "
            f"{identity.variant or ''} "
            f"{identity.transmission or ''}"
        ).strip()

        prompt = f"""
Research the maintenance requirements and preventive maintenance
considerations for:

{vehicle_description}

Confirm that sources apply to this vehicle before using them.

Find scheduled maintenance, preventive maintenance, and inspection
items from reputable technical sources.
"""

        response = await self.client.responses.create(
            model=settings.openai_research_model,
            instructions=RESEARCH_INSTRUCTIONS,
            input=prompt,
            tools=[
                {
                    "type": "web_search",
                }
            ],
            include=[
                "web_search_call.action.sources",
            ],
        )

        # Next step:
        # parse structured output
        # validate sources
        # construct MaintenanceKnowledgeProfile

        raise NotImplementedError