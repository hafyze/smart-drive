from urllib.parse import urlparse

from app.ai.schemas import (
    MaintenanceResearchResult,
    MaintenanceSourceType,
    ResearchSource,
    VehicleIdentity,
)


class SourceValidator:
    BLOCKED_DOMAINS = {
        "reddit.com",
        "www.reddit.com",
        "facebook.com",
        "www.facebook.com",
        "tiktok.com",
        "www.tiktok.com",
        "forum.lowyat.net",
        "mudah.my",
        "www.mudah.my",
        "softonic.com",
        "www.softonic.com",
        "scribd.com",
        "www.scribd.com",
    }

    # For now, start with manufacturers we actually test.
    # We can move this to configuration later.
    MANUFACTURER_DOMAINS = {
        "perodua": {
            "perodua.com.my",
            "www.perodua.com.my",
        },
    }

    # Reputable automotive publications / specialists
    # that may support secondary or preventive guidance.
    SPECIALIST_DOMAINS = {
        "paultan.org",
        "www.paultan.org",
        "wapcar.my",
        "www.wapcar.my",
    }

    def validate(
        self,
        identity: VehicleIdentity,
        research_result: MaintenanceResearchResult,
    ) -> MaintenanceResearchResult:

        valid_sources: list[ResearchSource] = []

        for source in research_result.sources:
            validated_source = self._validate_source(
                identity=identity,
                source=source,
            )

            if validated_source is not None:
                valid_sources.append(
                    validated_source
                )

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

    def _validate_source(
        self,
        identity: VehicleIdentity,
        source: ResearchSource,
    ) -> ResearchSource | None:

        if not self._has_valid_url(
            source.url
        ):
            return None

        hostname = self._get_hostname(
            source.url
        )

        if hostname is None:
            return None

        if self._is_blocked_domain(
            hostname
        ):
            return None

        source_type = self._determine_source_type(
            identity=identity,
            hostname=hostname,
        )

        # Reject unknown/untrusted domains for now.
        if source_type is None:
            return None

        vehicle_match = source.vehicle_match

        if vehicle_match is not None:

            if not self._same_text(
                vehicle_match.manufacturer,
                identity.manufacturer,
            ):
                return None

            if not self._same_text(
                vehicle_match.model,
                identity.model,
            ):
                return None

            if (
                identity.year is not None
                and not self._year_matches(
                    year=identity.year,
                    year_from=(
                        vehicle_match.year_from
                    ),
                    year_to=(
                        vehicle_match.year_to
                    ),
                )
            ):
                return None

            if (
                vehicle_match.transmission
                and identity.transmission
                and not self._same_text(
                    vehicle_match.transmission,
                    identity.transmission,
                )
            ):
                return None

            if (
                vehicle_match.variant
                and identity.variant
                and not self._variant_matches(
                    vehicle_match.variant,
                    identity.variant,
                )
            ):
                return None

        # Backend overrides Gemini's classification.
        source.source_type = source_type

        return source

    def _determine_source_type(
        self,
        identity: VehicleIdentity,
        hostname: str,
    ) -> MaintenanceSourceType | None:

        manufacturer_key = (
            identity.manufacturer
            .strip()
            .casefold()
        )

        manufacturer_domains = (
            self.MANUFACTURER_DOMAINS.get(
                manufacturer_key,
                set(),
            )
        )

        if hostname in manufacturer_domains:
            return (
                MaintenanceSourceType
                .MANUFACTURER
            )

        if hostname in self.SPECIALIST_DOMAINS:
            return (
                MaintenanceSourceType
                .SPECIALIST
            )

        return None

    @classmethod
    def _is_blocked_domain(
        cls,
        hostname: str,
    ) -> bool:

        return hostname in cls.BLOCKED_DOMAINS

    @staticmethod
    def _get_hostname(
        url: str,
    ) -> str | None:

        try:
            parsed = urlparse(url)

            if not parsed.hostname:
                return None

            return parsed.hostname.lower()

        except ValueError:
            return None

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