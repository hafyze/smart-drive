import unittest
from datetime import date

from app.schemas.maintenance import MaintenanceScheduleStatus, MaintenanceType
from app.services.maintenance_status import calculate_maintenance_status


class MaintenanceStatusTests(unittest.TestCase):
    def test_no_saved_due_value_has_no_schedule_status(self):
        result = calculate_maintenance_status(
            MaintenanceType.ENGINE_OIL,
            next_due_date=None,
            next_due_mileage=None,
            current_mileage=50_000,
            today=date(2026, 11, 9),
        )

        self.assertIsNone(result)

    def test_engine_oil_is_overdue_when_either_due_point_is_reached(self):
        due_by_mileage = calculate_maintenance_status(
            MaintenanceType.ENGINE_OIL,
            next_due_date=date(2026, 12, 1),
            next_due_mileage=50_000,
            current_mileage=50_000,
            today=date(2026, 11, 9),
        )
        due_by_date = calculate_maintenance_status(
            MaintenanceType.ENGINE_OIL,
            next_due_date=date(2026, 11, 9),
            next_due_mileage=55_000,
            current_mileage=50_000,
            today=date(2026, 11, 9),
        )

        self.assertEqual(due_by_mileage, MaintenanceScheduleStatus.OVERDUE)
        self.assertEqual(due_by_date, MaintenanceScheduleStatus.OVERDUE)

    def test_date_based_maintenance_uses_date(self):
        result = calculate_maintenance_status(
            MaintenanceType.COOLANT,
            next_due_date=date(2026, 11, 10),
            next_due_mileage=10_000,
            current_mileage=50_000,
            today=date(2026, 11, 9),
        )

        self.assertEqual(result, MaintenanceScheduleStatus.UPCOMING)

    def test_mileage_based_maintenance_uses_mileage(self):
        result = calculate_maintenance_status(
            MaintenanceType.OIL_FILTER,
            next_due_date=date(2026, 1, 1),
            next_due_mileage=51_000,
            current_mileage=50_000,
            today=date(2026, 11, 9),
        )

        self.assertEqual(result, MaintenanceScheduleStatus.UPCOMING)

    def test_other_uses_whichever_due_value_was_entered(self):
        result = calculate_maintenance_status(
            MaintenanceType.OTHER,
            next_due_date=None,
            next_due_mileage=49_000,
            current_mileage=50_000,
            today=date(2026, 11, 9),
        )

        self.assertEqual(result, MaintenanceScheduleStatus.OVERDUE)


if __name__ == "__main__":
    unittest.main()
