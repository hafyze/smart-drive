import unittest
from datetime import date, datetime, timezone
from unittest.mock import patch

from app.ai.maintenance_knowledge_service import MaintenanceKnowledgeService
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
            MaintenanceKnowledgeService._cache_key(self.identity, self.summary, 60_000),
            MaintenanceKnowledgeService._cache_key(self.identity, self.summary, 60_000),
        )
        self.assertNotEqual(
            MaintenanceKnowledgeService._cache_key(self.identity, self.summary, 60_000),
            MaintenanceKnowledgeService._cache_key(self.identity, changed_summary, 60_000),
        )
        self.assertNotEqual(
            MaintenanceKnowledgeService._cache_key(self.identity, self.summary, 60_000),
            MaintenanceKnowledgeService._cache_key(self.identity, self.summary, 61_000),
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


if __name__ == "__main__":
    unittest.main()
