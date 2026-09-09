from google import genai
from google.genai import types

from app.ai.research.base import (
    MaintenanceResearchProvider,
)
from app.ai.schemas import (
    MaintenanceResearchResult,
    VehicleIdentity,
)
from app.ai.search.schemas import SearchResult
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
        search_results: list[SearchResult],
    ) -> MaintenanceResearchResult:

        if not search_results:
            return MaintenanceResearchResult(
                guidance=[],
                sources=[],
            )

        prompt = self.build_maintenance_research_prompt(
            identity=identity,
            search_results=search_results,
        )

        response = (
            await self.client.aio.models.generate_content(
                model=settings.gemini_research_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
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

        result = (
            MaintenanceResearchResult
            .model_validate_json(
                response.text
            )
        )

        return self._enforce_source_allowlist(
            result=result,
            search_results=search_results,
        )

    def _build_source_context(
        self,
        search_results: list[SearchResult],
    ) -> str:

        sections: list[str] = []

        for index, source in enumerate(
            search_results,
            start=1,
        ):
            sections.append(
                f"""
SOURCE {index}

Title:
{source.title}

URL:
{source.url}

Content:
{source.content or "No content available."}
""".strip()
            )

        return "\n\n---\n\n".join(sections)

    def build_maintenance_research_prompt(
        self,
        identity: VehicleIdentity,
        search_results: list[SearchResult],
    ) -> str:

        sources = self._build_source_context(
            search_results
        )

        return f"""
You are extracting vehicle maintenance information
from supplied search evidence.

VEHICLE

Manufacturer: {identity.manufacturer}
Model: {identity.model}
Variant: {identity.variant}
Year: {identity.year}
Transmission: {identity.transmission}

IMPORTANT RULES

1. Use ONLY the supplied sources below.

2. Do NOT search the web yourself.

3. Do NOT invent URLs.

4. Every maintenance claim must be supported by at
   least one supplied source.

5. source_urls may contain ONLY URLs that appear
   exactly in the supplied sources.

6. If the supplied evidence does not support a
   maintenance claim, omit that claim.

7. Do not infer an interval merely because it is
   common for similar vehicles.

8. Do not silently substitute another generation,
   year, engine, variant, or transmission.

9. Keep these categories distinct:

   - scheduled manufacturer maintenance
   - component/OEM technical guidance
   - preventive maintenance recommendation
   - inspection recommendation

10. Preventive or specialist advice must never be
    described as manufacturer-required maintenance.

11. If sources conflict, preserve the distinction.
    Do not silently choose one interval.

12. Return an empty guidance list if trustworthy
    maintenance guidance cannot be extracted from
    the provided evidence.

For vehicle_match:

- Identify the manufacturer and model actually
  supported by the source.

- Only provide variant when the source clearly
  supports that variant.

- Only provide transmission when the source clearly
  supports that transmission.

- Only provide year_from and year_to when those
  years are supported by the evidence.

SUPPLIED SOURCES

{sources}
"""

    def _enforce_source_allowlist(
        self,
        result: MaintenanceResearchResult,
        search_results: list[SearchResult],
    ) -> MaintenanceResearchResult:

        allowed_urls = {
            str(source.url)
            for source in search_results
        }

        valid_sources = [
            source
            for source in result.sources
            if source.url in allowed_urls
        ]

        validated_guidance = []

        for guidance in result.guidance:
            valid_urls = [
                url
                for url in guidance.source_urls
                if url in allowed_urls
            ]

            guidance.source_urls = valid_urls

            if valid_urls:
                validated_guidance.append(
                    guidance
                )

        result.sources = valid_sources
        result.guidance = (
            validated_guidance
        )

        return result