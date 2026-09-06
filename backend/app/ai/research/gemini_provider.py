from google import genai
from google.genai import types

from app.ai.research.base import (
    MaintenanceResearchProvider,
)
from app.ai.research.prompts import (
    RESEARCH_INSTRUCTIONS,
)
from app.ai.schemas import (
    MaintenanceResearchResult,
    VehicleIdentity,
)
from app.core.config import settings


class GeminiResearchProvider(
    MaintenanceResearchProvider
):
    def __init__(self):
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured."
            )

        self.client = genai.Client(
            api_key=settings.gemini_api_key
        )

    async def research(
        self,
        identity: VehicleIdentity,
    ) -> MaintenanceResearchResult:

        vehicle_description = " ".join(
            filter(
                None,
                [
                    str(identity.year),
                    identity.manufacturer,
                    identity.model,
                    identity.variant,
                    identity.transmission,
                ],
            )
        )

        prompt = f"""
{RESEARCH_INSTRUCTIONS}

Research this exact vehicle:

{vehicle_description}

Find:
- scheduled maintenance
- preventive maintenance
- inspections
- applicable mileage intervals
- applicable time intervals

Confirm applicability to the requested vehicle before using
each source.

Return only information supported by reputable sources.
"""

        response = await self.client.aio.models.generate_content(
            model=settings.gemini_research_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[
                    types.Tool(
                        google_search=types.GoogleSearch()
                    )
                ],
            ),
        )

        print(response.text)

        raise NotImplementedError(
            "Structured research parsing not implemented yet."
        )