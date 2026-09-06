import json

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

        vehicle_description = (
            self._build_vehicle_description(
                identity
            )
        )

        research_text, sources = (
            await self._perform_grounded_research(
                vehicle_description
            )
        )

        if not research_text:
            raise RuntimeError(
                "Gemini returned an empty research response."
            )

        return await self._structure_research(
            vehicle_description=vehicle_description,
            research_text=research_text,
            sources=sources,
        )

    def _build_vehicle_description(
        self,
        identity: VehicleIdentity,
    ) -> str:

        values = [
            str(identity.year)
            if identity.year
            else None,
            identity.manufacturer,
            identity.model,
            identity.variant,
            identity.transmission,
        ]

        return " ".join(
            value
            for value in values
            if value
        )

    async def _perform_grounded_research(
        self,
        vehicle_description: str,
    ) -> tuple[str, list[dict]]:

        prompt = f"""
    {RESEARCH_INSTRUCTIONS}

    Research maintenance guidance for this exact vehicle:

    {vehicle_description}

    For this developer test:
    - do not invent sources
    - clearly state uncertainty
    - separate scheduled, preventive, and inspection items
    """

        response = (
            await self.client.aio.models.generate_content(
                model=settings.gemini_research_model,
                contents=prompt,
            )
        )

        research_text = response.text or ""

        return research_text, []

    async def _structure_research(
        self,
        vehicle_description: str,
        research_text: str,
        sources: list[dict],
    ) -> MaintenanceResearchResult:

        sources_json = json.dumps(
            sources,
            indent=2,
            ensure_ascii=False,
        )

        prompt = f"""
Convert the following grounded vehicle maintenance research into
the required structured format.

VEHICLE:
{vehicle_description}

RESEARCH:
{research_text}

VERIFIED SEARCH SOURCES:
{sources_json}

Important rules:

- Use only information present in the research.
- Do not add maintenance facts from your own memory.
- Do not invent URLs.
- source_urls must contain only URLs listed under
  VERIFIED SEARCH SOURCES.
- Preserve uncertainty when the research is uncertain.
- Do not describe specialist preventive maintenance as manufacturer
  scheduled maintenance.
  
This is a developer smoke test.

You may structure maintenance information from RESEARCH even when
VERIFIED SEARCH SOURCES is empty.

When no verified source exists:
- source_urls must be []
- do not invent URLs

For vehicle_match:
- identify the manufacturer and model covered by the source.
- provide variant only when the source clearly identifies it.
- provide transmission only when the source clearly identifies it.
- provide year_from/year_to only when supported.
"""

        response = (
            await self.client.aio.models.generate_content(
                model=settings.gemini_research_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type=(
                        "application/json"
                    ),
                    response_schema=(
                        MaintenanceResearchResult
                    ),
                ),
            )
        )

        if not response.text:
            raise RuntimeError(
                "Gemini returned an empty structured response."
            )

        return (
            MaintenanceResearchResult
            .model_validate_json(
                response.text
            )
        )

    @staticmethod
    def _extract_grounding_sources(
        response,
    ) -> list[dict]:

        sources: list[dict] = []
        seen_urls: set[str] = set()

        candidates = getattr(
            response,
            "candidates",
            None,
        )

        if not candidates:
            return sources

        candidate = candidates[0]

        grounding_metadata = getattr(
            candidate,
            "grounding_metadata",
            None,
        )

        if grounding_metadata is None:
            return sources

        grounding_chunks = getattr(
            grounding_metadata,
            "grounding_chunks",
            None,
        )

        if not grounding_chunks:
            return sources

        for chunk in grounding_chunks:
            web = getattr(
                chunk,
                "web",
                None,
            )

            if web is None:
                continue

            url = getattr(
                web,
                "uri",
                None,
            )

            title = getattr(
                web,
                "title",
                None,
            )

            if not url:
                continue

            if url in seen_urls:
                continue

            seen_urls.add(url)

            sources.append(
                {
                    "url": url,
                    "title": title or url,
                }
            )

        return sources