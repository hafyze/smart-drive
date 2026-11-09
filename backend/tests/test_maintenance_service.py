import unittest
from datetime import date

from bson import ObjectId

from app.schemas.maintenance import (
    MaintenanceItemCreate,
    MaintenanceScheduleStatus,
    MaintenanceType,
    ServiceVisitCreate,
)
from app.services.maintenance_service import MaintenanceService


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The test coroutine unexpectedly waited for I/O")


class MaintenanceServiceTests(unittest.TestCase):
    def test_create_saves_owner_scoped_visit_and_schedule_status(self):
        vehicle_id = ObjectId()

        class VehicleRepository:
            async def find_one(self, query):
                self.query = query
                return {
                    "_id": vehicle_id,
                    "user_id": "owner-1",
                    "current_mileage": 10_000,
                    "deleted_at": None,
                }

        class MaintenanceRepository:
            async def insert(self, document):
                self.document = document
                return document

        service = MaintenanceService.__new__(MaintenanceService)
        service.vehicle_repository = VehicleRepository()
        service.repository = MaintenanceRepository()
        request = ServiceVisitCreate(
            vehicle_id=str(vehicle_id),
            service_date=date(2026, 10, 1),
            mileage_at_service=9_000,
            workshop="Test Workshop",
            items=[
                MaintenanceItemCreate(
                    type=MaintenanceType.ENGINE_OIL,
                    description="Oil change",
                    cost=120,
                    next_due_mileage=15_000,
                )
            ],
        )

        result = run_immediate_coroutine(
            service.create_service_visit("owner-1", request)
        )

        saved = service.repository.document
        self.assertEqual(saved["user_id"], "owner-1")
        self.assertEqual(saved["vehicle_id"], vehicle_id)
        self.assertEqual(saved["mileage_at_service"], 9_000)
        self.assertEqual(len(saved["items"]), 1)
        self.assertEqual(
            saved["items"][0]["schedule_status"],
            MaintenanceScheduleStatus.UPCOMING,
        )
        self.assertEqual(result.user_id, "owner-1")
        self.assertEqual(result.items[0].cost, 120)


if __name__ == "__main__":
    unittest.main()
