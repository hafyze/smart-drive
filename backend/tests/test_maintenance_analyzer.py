import unittest
from datetime import date

from app.ai.maintenance_analyzer import MaintenanceAnalyzer


class MaintenanceAnalyzerTests(unittest.TestCase):
    def setUp(self):
        self.analyzer = MaintenanceAnalyzer()

    def test_tracks_latest_mileage_and_distance_for_each_item_type(self):
        visits = [
            {
                "service_date": date(2025, 3, 1),
                "mileage_at_service": 60_000,
                "items": [{"type": "ENGINE_OIL", "cost": 80}],
            },
            {
                "service_date": date(2024, 3, 1),
                "mileage_at_service": 50_000,
                "items": [{"type": "ENGINE_OIL", "cost": 75}],
            },
        ]

        summary = self.analyzer.analyze(visits, current_mileage=62_500)

        item = summary.maintenance_items[0]
        self.assertEqual(item.last_done_date, date(2025, 3, 1))
        self.assertEqual(item.last_done_mileage, 60_000)
        self.assertEqual(item.mileage_since_last_done, 2_500)
        self.assertEqual(item.times_recorded, 2)

    def test_handles_missing_and_future_mileage_without_negative_distance(self):
        visits = [
            {
                "service_date": date(2025, 1, 1),
                "mileage_at_service": None,
                "items": [{"type": "ENGINE_OIL"}],
            },
            {
                "service_date": date(2025, 2, 1),
                "mileage_at_service": 20_000,
                "items": [{"type": "TYRE"}],
            },
        ]

        summary = self.analyzer.analyze(visits, current_mileage=19_000)
        by_type = {item.type: item for item in summary.maintenance_items}

        self.assertIsNone(by_type["ENGINE_OIL"].last_done_mileage)
        self.assertIsNone(by_type["ENGINE_OIL"].mileage_since_last_done)
        self.assertEqual(by_type["TYRE"].last_done_mileage, 20_000)
        self.assertIsNone(by_type["TYRE"].mileage_since_last_done)


if __name__ == "__main__":
    unittest.main()
