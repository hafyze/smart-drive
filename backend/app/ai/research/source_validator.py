from urllib.parse import urlparse

from app.ai.schemas import (
    MaintenanceResearchResult,
    ResearchSource,
    VehicleIdentity,
)

class SourceValidator:
    def validate(self, identity: VehicleIdentity, research_result: MaintenanceResearchResult) -> MaintenanceResearchResult:
        valid_sources = [
            source
            for source in research_result.sources
            if self._is_valid_source(
                identity=identity,
                source=source,
            )
        ]

        valid_urls = {
            source.url
            for source in valid_sources
        }

        valid_guidance = []

        for item in research_result.guidance:
            matching_urls = [
                url
                for url in item.source_urls
                if url in valid_urls
            ]

            if not matching_urls:
                continue

            item.source_urls = matching_urls

            valid_guidance.append(item)

        return MaintenanceResearchResult(
            guidance=valid_guidance,
            sources=valid_sources,
        )

    def _is_valid_source(
        self,
        identity: VehicleIdentity,
        source: ResearchSource,
    ) -> bool:

        if not self._has_valid_url(
            source.url
        ):
            return False

        vehicle_match = source.vehicle_match

        if vehicle_match is None:
            return True

        if not self._same_text(
            vehicle_match.manufacturer,
            identity.manufacturer,
        ):
            return False

        if not self._same_text(
            vehicle_match.model,
            identity.model,
        ):
            return False

        if (
            identity.year is not None
            and not self._year_matches(
                year=identity.year,
                year_from=vehicle_match.year_from,
                year_to=vehicle_match.year_to,
            )
        ):
            return False

        if (
            vehicle_match.transmission
            and identity.transmission
            and not self._same_text(
                vehicle_match.transmission,
                identity.transmission,
            )
        ):
            return False

        if (
            vehicle_match.variant
            and identity.variant
            and not self._variant_matches(
                vehicle_match.variant,
                identity.variant,
            )
        ):
            return False

        return True

    @staticmethod
    def _same_text(
        first: str,
        second: str,
    ) -> bool:
        return (
            first.strip().casefold()
            == second.strip().casefold()
        )

    @staticmethod
    def _variant_matches(
        source_variant: str,
        requested_variant: str,
    ) -> bool:
        source = (
            source_variant
            .strip()
            .casefold()
        )

        requested = (
            requested_variant
            .strip()
            .casefold()
        )

        return (
            source == requested
            or source in requested
            or requested in source
        )

    @staticmethod
    def _year_matches(
        year: int,
        year_from: int | None,
        year_to: int | None,
    ) -> bool:

        if (
            year_from is None
            and year_to is None
        ):
            return True

        if (
            year_from is not None
            and year < year_from
        ):
            return False

        if (
            year_to is not None
            and year > year_to
        ):
            return False

        return True

    @staticmethod
    def _has_valid_url(
        url: str,
    ) -> bool:
        try:
            parsed = urlparse(url)

            return (
                parsed.scheme in {
                    "http",
                    "https",
                }
                and bool(parsed.netloc)
            )

        except ValueError:
            return False