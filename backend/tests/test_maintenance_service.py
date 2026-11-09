import unittest
from datetime import date, datetime, timezone

from bson import ObjectId
from fastapi import HTTPException

from app.schemas.maintenance import (
    MaintenanceItemCreate,
    MaintenanceScheduleStatus,
    MaintenanceType,
    ServiceVisitCreate,
    ServiceVisitUpdate,
)
from app.services.maintenance_service import MaintenanceService
from app.services.service_history_service import ServiceHistoryService


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

    def make_existing_visit(self):
        now = datetime(2026, 10, 1, tzinfo=timezone.utc)
        vehicle_id = ObjectId()
        visit = {
            "_id": ObjectId(),
            "user_id": "owner-1",
            "vehicle_id": vehicle_id,
            "service_date": now,
            "mileage_at_service": 9_000,
            "workshop": "Original workshop",
            "notes": "Original note",
            "items": [{
                "id": "item-1",
                "type": "ENGINE_OIL",
                "description": "Oil change",
                "next_due_date": None,
                "next_due_mileage": 15_000,
                "cost": 120,
                "notes": None,
                "status": "COMPLETED",
                "schedule_status": "UPCOMING",
            }],
            "created_at": now,
            "updated_at": now,
        }
        return vehicle_id, visit

    def test_partial_visit_update_preserves_existing_items_and_other_fields(self):
        vehicle_id, visit = self.make_existing_visit()

        class MaintenanceRepository:
            async def find_one(self, _query):
                return visit

            async def update(self, _query, update_data):
                visit.update(update_data)
                return visit

        class VehicleRepository:
            async def find_one(self, _query):
                return {"_id": vehicle_id, "user_id": "owner-1", "current_mileage": 10_000, "deleted_at": None}

        service = MaintenanceService.__new__(MaintenanceService)
        service.repository = MaintenanceRepository()
        service.vehicle_repository = VehicleRepository()
        original_items = [item.copy() for item in visit["items"]]

        result = run_immediate_coroutine(
            service.update_service_visit(
                str(visit["_id"]),
                "owner-1",
                ServiceVisitUpdate(notes="Corrected visit note"),
            )
        )

        self.assertEqual(result.notes, "Corrected visit note")
        self.assertEqual(visit["items"], original_items)
        self.assertEqual(result.items[0].id, "item-1")
        self.assertEqual(result.workshop, "Original workshop")

    def test_delete_visit_is_owner_scoped(self):
        _, visit = self.make_existing_visit()

        class MaintenanceRepository:
            deleted_query = None

            async def find_one(self, _query):
                return visit

            async def delete(self, query):
                self.deleted_query = query
                return True

        service = MaintenanceService.__new__(MaintenanceService)
        service.repository = MaintenanceRepository()

        with self.assertRaises(HTTPException) as caught:
            run_immediate_coroutine(
                service.delete_service_visit(str(visit["_id"]), "other-user")
            )
        self.assertEqual(caught.exception.status_code, 403)
        self.assertIsNone(service.repository.deleted_query)

        result = run_immediate_coroutine(
            service.delete_service_visit(str(visit["_id"]), "owner-1")
        )
        self.assertEqual(result, {"success": True})
        self.assertEqual(service.repository.deleted_query["_id"], visit["_id"])


class ServiceHistoryServiceTests(unittest.TestCase):
    def test_history_sorts_records_and_totals_completed_item_costs(self):
        vehicle_id = ObjectId()
        older = {
            "_id": ObjectId(),
            "user_id": "owner-1",
            "vehicle_id": vehicle_id,
            "service_date": datetime(2025, 1, 1, tzinfo=timezone.utc),
            "mileage_at_service": 5_000,
            "workshop": "Older shop",
            "items": [{"id": "old-item", "type": "ENGINE_OIL", "status": "COMPLETED", "cost": 100}],
        }
        newer = {
            "_id": ObjectId(),
            "user_id": "owner-1",
            "vehicle_id": vehicle_id,
            "service_date": datetime(2026, 5, 1, tzinfo=timezone.utc),
            "mileage_at_service": 10_000,
            "workshop": "Newer shop",
            "items": [
                {"id": "new-item-1", "type": "ENGINE_OIL", "status": "COMPLETED", "cost": 120},
                {"id": "new-item-2", "type": "OIL_FILTER", "status": "COMPLETED", "cost": 30},
            ],
        }

        class VehicleRepository:
            async def find_one(self, _query):
                return {"_id": vehicle_id, "user_id": "owner-1", "deleted_at": None}

        class MaintenanceRepository:
            async def find_many(self, query):
                self.query = query
                return [older, newer]

        service = ServiceHistoryService.__new__(ServiceHistoryService)
        service.vehicle_repository = VehicleRepository()
        service.maintenance_repository = MaintenanceRepository()

        records = run_immediate_coroutine(
            service.get_vehicle_service_history(str(vehicle_id), "owner-1")
        )

        self.assertEqual([record.workshop for record in records], ["Newer shop", "Older shop"])
        self.assertEqual(records[0].total_cost, 150)
        self.assertEqual(records[0].mileage, 10_000)
        self.assertEqual(service.maintenance_repository.query["user_id"], "owner-1")


if __name__ == "__main__":
    unittest.main()
