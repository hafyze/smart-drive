import unittest
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from app.ai.maintenance_knowledge_service import MaintenanceKnowledgeService, ResearchCooldownError
from app.ai.research.gemini_provider import GeminiResearchProvider
from app.ai.research.source_validator import SourceValidator
from app.ai.schemas import (
    MaintenanceItemSummary,
    MaintenanceRecommendationType,
    MaintenanceKnowledgeProfile,
    MaintenanceResearchResult,
    MaintenanceSourceType,
    MaintenanceSummary,
    ResearchedMaintenanceItem,
    ResearchSource,
    ResearchedVehicleMatch,
    VehicleIdentity,
    VehicleIdentityConfidence,
)
from app.ai.search.schemas import SearchResult


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The coroutine unexpectedly waited for I/O")


class MaintenanceResearchTests(unittest.TestCase):
    def setUp(self):
        self.identity = VehicleIdentity(
            manufacturer="Perodua",
            model="Myvi",
            variant="1.5 AV",
            year=2023,
            transmission="AUTOMATIC",
            confidence=VehicleIdentityConfidence.HIGH,
        )
        self.summary = MaintenanceSummary(
            total_service_visits=2,
            maintenance_items=[
                MaintenanceItemSummary(
                    type="ENGINE_OIL",
                    last_done_date=date(2026, 6, 1),
                    last_done_mileage=55_000,
                    mileage_since_last_done=5_000,
                    next_due_mileage=60_000,
                    times_recorded=3,
                )
            ],
        )

    def test_cache_key_changes_when_saved_history_changes(self):
        changed_summary = self.summary.model_copy(deep=True)
        changed_summary.maintenance_items[0].last_done_mileage = 58_000

        self.assertEqual(
            MaintenanceKnowledgeService._cache_key("owner", "vehicle", self.identity, self.summary, 60_000),
            MaintenanceKnowledgeService._cache_key("owner", "vehicle", self.identity, self.summary, 60_000),
        )
        self.assertNotEqual(
            MaintenanceKnowledgeService._cache_key("owner", "vehicle", self.identity, self.summary, 60_000),
            MaintenanceKnowledgeService._cache_key("owner", "vehicle", self.identity, changed_summary, 60_000),
        )
        self.assertNotEqual(
            MaintenanceKnowledgeService._cache_key("owner", "vehicle", self.identity, self.summary, 60_000),
            MaintenanceKnowledgeService._cache_key("owner", "vehicle", self.identity, self.summary, 61_000),
        )
        self.assertNotEqual(
            MaintenanceKnowledgeService._cache_key("owner-a", "vehicle", self.identity, self.summary, 60_000),
            MaintenanceKnowledgeService._cache_key("owner-b", "vehicle", self.identity, self.summary, 60_000),
        )
        self.assertNotEqual(
            MaintenanceKnowledgeService._cache_key("owner", "vehicle-a", self.identity, self.summary, 60_000),
            MaintenanceKnowledgeService._cache_key("owner", "vehicle-b", self.identity, self.summary, 60_000),
        )

    def test_research_prompt_includes_summary_without_cost_totals(self):
        provider = GeminiResearchProvider.__new__(GeminiResearchProvider)
        prompt = provider.build_maintenance_research_prompt(
            identity=self.identity,
            search_results=[
                SearchResult(
                    title="Perodua maintenance guide",
                    url="https://www.perodua.com.my/maintenance",
                    content="Replace engine oil according to the service schedule.",
                    score=0.9,
                    query="Myvi maintenance",
                )
            ],
            maintenance_summary=self.summary,
            current_mileage=60_000,
        )

        self.assertIn("ENGINE_OIL", prompt)
        self.assertIn("55000", prompt)
        self.assertIn("60000", prompt)
        self.assertIn('"current_odometer_km": 60000', prompt)
        self.assertIn("missing", prompt.lower())
        self.assertNotIn("total_recorded_cost", prompt)

    def test_valid_cache_is_returned_without_constructing_external_providers(self):
        profile = MaintenanceKnowledgeProfile(
            manufacturer="Perodua",
            model="Myvi",
            year=2023,
            transmission="AUTOMATIC",
            vehicle_match_confidence=VehicleIdentityConfidence.HIGH,
            guidance=[],
            generated_at=datetime.now(timezone.utc),
        )

        class CachedRepository:
            async def get_valid_profile(self, cache_key, now, schema_version):
                return {"profile": profile.model_dump(mode="json")}

        service = MaintenanceKnowledgeService(repository=CachedRepository())

        with (
            patch("app.ai.maintenance_knowledge_service.get_maintenance_search_provider") as search_factory,
            patch("app.ai.maintenance_knowledge_service.get_research_provider") as research_factory,
        ):
            pending = service.get_maintenance_profile(
                "owner-1",
                "vehicle-1",
                self.identity,
                self.summary,
                60_000,
            )
            try:
                pending.send(None)
            except StopIteration as result:
                self.assertEqual(result.value, profile)
            else:
                self.fail("Cache lookup should complete without external I/O")

        search_factory.assert_not_called()
        research_factory.assert_not_called()

    def test_source_validation_removes_untrusted_and_mismatched_sources(self):
        accepted_url = "https://www.paultan.org/myvi-maintenance"
        rejected_url = "https://example.invalid/myvi-maintenance"
        result = MaintenanceResearchResult(
            sources=[
                ResearchSource(
                    name="Paul Tan",
                    url=accepted_url,
                    source_type=MaintenanceSourceType.SPECIALIST,
                    vehicle_match=ResearchedVehicleMatch(
                        manufacturer="Perodua",
                        model="Myvi",
                        year_from=2022,
                        year_to=2024,
                        transmission="AUTOMATIC",
                        variant="1.5 AV",
                    ),
                ),
                ResearchSource(
                    name="Unverified blog",
                    url=rejected_url,
                    source_type=MaintenanceSourceType.SPECIALIST,
                ),
                ResearchSource(
                    name="Wrong model reference",
                    url="https://www.wapcar.my/wrong-model",
                    source_type=MaintenanceSourceType.SPECIALIST,
                    vehicle_match=ResearchedVehicleMatch(
                        manufacturer="Perodua",
                        model="Axia",
                    ),
                ),
            ],
            guidance=[
                ResearchedMaintenanceItem(
                    key="engine oil",
                    name="Engine oil",
                    recommendation_type=MaintenanceRecommendationType.SCHEDULED,
                    interval_km=10_000,
                    source_urls=[accepted_url, rejected_url],
                )
            ],
        )

        validated = SourceValidator().validate(self.identity, result)

        self.assertEqual([source.url for source in validated.sources], [accepted_url])
        self.assertEqual(validated.guidance[0].source_urls, [accepted_url])

    def test_source_without_vehicle_match_is_rejected(self):
        result = MaintenanceResearchResult(
            sources=[ResearchSource(
                name="Unmatched source",
                url="https://www.paultan.org/service-guide",
                source_type=MaintenanceSourceType.SPECIALIST,
            )],
            guidance=[],
        )
        self.assertEqual(SourceValidator().validate(self.identity, result).sources, [])

    def test_prompt_is_bounded_and_keeps_cited_url_intact(self):
        provider = GeminiResearchProvider.__new__(GeminiResearchProvider)
        sources = [
            SearchResult(
                title="T" * 2_000,
                url=f"https://www.paultan.org/guide-{index}",
                content="evidence " * 1_000,
                score=1.0 - index / 20,
            )
            for index in range(20)
        ]
        prompt = provider.build_maintenance_research_prompt(
            self.identity, sources, self.summary, 60_000,
        )
        self.assertLessEqual(len(prompt), provider.MAX_PROMPT_CHARS)
        self.assertIn("https://www.paultan.org/guide-0", prompt)
        self.assertNotIn("https://www.paultan.org/guide-19", prompt)

    def test_cached_profile_can_be_read_without_acquiring_cooldown(self):
        profile = MaintenanceKnowledgeProfile(
            manufacturer="Perodua", model="Myvi", year=2023,
            transmission="AUTOMATIC",
            vehicle_match_confidence=VehicleIdentityConfidence.HIGH,
            guidance=[], generated_at=datetime.now(timezone.utc),
        )

        class CachedRepository:
            async def get_valid_profile(self, cache_key, now, schema_version):
                return {"profile": profile.model_dump(mode="json")}

            async def acquire_research_cooldown(self, *args):
                raise AssertionError("Cache-only lookup must not acquire cooldown")

        service = MaintenanceKnowledgeService(repository=CachedRepository())
        result = run_immediate_coroutine(service.get_cached_profile(
            "owner-1", "vehicle-1", self.identity, self.summary, 60_000,
        ))
        self.assertEqual(result, profile)

    def test_cooldown_rejects_uncached_attempt_before_calling_providers(self):
        class CoolingRepository:
            async def get_valid_profile(self, cache_key, now, schema_version):
                return None

            async def acquire_research_cooldown(self, user_id, vehicle_id, now, duration):
                return now + timedelta(seconds=47)

        class NeverCalledProvider:
            async def search(self, identity):
                raise AssertionError("Cooldown must be checked before external calls")

        service = MaintenanceKnowledgeService(
            repository=CoolingRepository(),
            search_provider=NeverCalledProvider(),
            research_provider=NeverCalledProvider(),
        )
        cache_key = service._cache_key(
            "owner-1", "vehicle-1", self.identity, self.summary, 60_000,
        )
        with self.assertRaises(ResearchCooldownError) as caught:
            run_immediate_coroutine(service._research_and_cache(
                "owner-1", "vehicle-1", cache_key, self.identity, self.summary, 60_000,
            ))
        self.assertGreaterEqual(caught.exception.retry_after_seconds, 1)
        self.assertLessEqual(caught.exception.retry_after_seconds, 47)

    def test_uncached_provider_results_are_validated_and_cached(self):
        source_url = "https://www.paultan.org/myvi-maintenance"
        accepted = MaintenanceResearchResult(
            sources=[ResearchSource(
                name="Paul Tan", url=source_url,
                source_type=MaintenanceSourceType.SPECIALIST,
                vehicle_match=ResearchedVehicleMatch(
                    manufacturer="Perodua", model="Myvi",
                ),
            )],
            guidance=[ResearchedMaintenanceItem(
                key="engine oil", name="Engine oil",
                recommendation_type=MaintenanceRecommendationType.PREVENTIVE,
                source_urls=[source_url],
            )],
        )

        class Repository:
            saved = None

            async def get_valid_profile(self, cache_key, now, schema_version):
                return None

            async def acquire_research_cooldown(self, user_id, vehicle_id, now, duration):
                return None

            async def save_profile(self, **values):
                self.saved = values

        class Search:
            async def search(self, identity):
                return [SearchResult(title="Guide", url=source_url, content="Evidence")]

        class Research:
            async def research(self, **kwargs):
                return accepted

        repository = Repository()
        service = MaintenanceKnowledgeService(repository, Search(), Research())
        cache_key = service._cache_key(
            "owner-1", "vehicle-1", self.identity, self.summary, 60_000,
        )
        profile = run_immediate_coroutine(service._research_and_cache(
            "owner-1", "vehicle-1", cache_key, self.identity, self.summary, 60_000,
        ))
        self.assertEqual([item.url for item in profile.guidance[0].sources], [source_url])
        self.assertIsNotNone(repository.saved)
        self.assertEqual(repository.saved["schema_version"], service.CACHE_SCHEMA_VERSION)
        cache_remaining = repository.saved["expires_at"] - datetime.now(timezone.utc)
        self.assertLessEqual(cache_remaining, service.CACHE_TTL)
        self.assertGreater(cache_remaining, service.CACHE_TTL - timedelta(seconds=1))


if __name__ == "__main__":
    unittest.main()
