from datetime import datetime, timezone

from app.ai.schemas import (
    KnowledgeConfidence,
    MaintenanceGuidanceItem,
    MaintenanceKnowledgeProfile,
    MaintenanceResearchResult,
    MaintenanceSource,
    MaintenanceSourceType,
    VehicleIdentity,
)


class KnowledgeNormalizer:
    def normalize(
        self,
        identity: VehicleIdentity,
        research_result: MaintenanceResearchResult,
    ) -> MaintenanceKnowledgeProfile:

        sources_by_url = {
            source.url: source
            for source in research_result.sources
        }

        guidance = []

        for researched_item in (
            research_result.guidance
        ):
            item_sources = []

            for source_url in (
                researched_item.source_urls
            ):
                source = sources_by_url.get(
                    source_url
                )

                if source is None:
                    continue

                item_sources.append(
                    MaintenanceSource(
                        name=source.name,
                        url=source.url,
                        title=source.title,
                        source_type=(
                            source.source_type
                        ),
                    )
                )

            if not item_sources:
                continue

            confidence = (
                self._calculate_confidence(
                    item_sources
                )
            )

            guidance.append(
                MaintenanceGuidanceItem(
                    key=self._normalize_key(
                        researched_item.key
                    ),
                    name=researched_item.name,
                    recommendation_type=(
                        researched_item
                        .recommendation_type
                    ),
                    interval_km=(
                        researched_item
                        .interval_km
                    ),
                    interval_months=(
                        researched_item
                        .interval_months
                    ),
                    starting_mileage=(
                        researched_item
                        .starting_mileage
                    ),
                    description=(
                        researched_item
                        .description
                    ),
                    reason=(
                        researched_item.reason
                    ),
                    confidence=confidence,
                    sources=item_sources,
                )
            )

        return MaintenanceKnowledgeProfile(
            manufacturer=(
                identity.manufacturer
            ),
            model=identity.model,
            variant=identity.variant,
            year=(
                identity.year
                if identity.year is not None
                else 0
            ),
            transmission=(
                identity.transmission
                or "UNKNOWN"
            ),
            vehicle_match_confidence=(
                identity.confidence
            ),
            guidance=guidance,
            generated_at=(
                datetime.now(
                    timezone.utc
                )
            ),
        )

    def _calculate_confidence(
        self,
        sources: list[MaintenanceSource],
    ) -> KnowledgeConfidence:

        source_types = {
            source.source_type
            for source in sources
        }

        if (
            MaintenanceSourceType.MANUFACTURER
            in source_types
        ):
            return KnowledgeConfidence.HIGH

        if (
            MaintenanceSourceType.OEM
            in source_types
        ):
            return KnowledgeConfidence.HIGH

        if (
            MaintenanceSourceType.TECHNICAL_DATABASE
            in source_types
        ):
            return KnowledgeConfidence.MEDIUM

        if (
            len(sources) >= 2
            and MaintenanceSourceType.SPECIALIST
            in source_types
        ):
            return KnowledgeConfidence.MEDIUM

        return KnowledgeConfidence.LOW

    @staticmethod
    def _normalize_key(
        value: str,
    ) -> str:
        return (
            value
            .strip()
            .upper()
            .replace(" ", "_")
            .replace("-", "_")
        )