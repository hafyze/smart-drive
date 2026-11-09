import unittest

from bson import ObjectId

from app.schemas.vehicle import FuelType, TransmissionType
from app.services.vehicle_service import VehicleService


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("Expected the mocked repository call to complete immediately")


class VehicleListTests(unittest.TestCase):
    def test_list_returns_compact_vehicle_metadata_for_garage_views(self):
        vehicle_id = ObjectId()
        vehicle = {
            "_id": vehicle_id,
            "user_id": "owner-1",
            "deleted_at": None,
            "nickname": "Daily",
            "manufacturer": "Perodua",
            "model": "Myvi",
            "variant": "1.5 AV",
            "year": 2023,
            "current_mileage": 33_000,
            "fuel_type": "PETROL",
            "transmission": "CVT",
            "plate_number": "VAB 1234",
            "status": "ACTIVE",
            "photo_url": None,
        }

        class Repository:
            async def find_many(self, query):
                self.query = query
                return [vehicle]

        service = VehicleService.__new__(VehicleService)
        service.repository = Repository()

        result = run_immediate_coroutine(service.get_all_vehicles("owner-1"))

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].id, str(vehicle_id))
        self.assertEqual(result[0].fuel_type, FuelType.PETROL)
        self.assertEqual(result[0].transmission, TransmissionType.CVT)
        self.assertEqual(result[0].plate_number, "VAB 1234")
        self.assertEqual(service.repository.query["user_id"], "owner-1")
        self.assertIsNone(service.repository.query["deleted_at"])

    def test_list_remains_compatible_with_older_documents_missing_optional_metadata(self):
        vehicle = {
            "_id": ObjectId(),
            "user_id": "owner-1",
            "deleted_at": None,
            "nickname": "Older car",
            "manufacturer": "Toyota",
            "model": "Vios",
            "variant": "1.5G",
            "year": 2019,
            "current_mileage": 80_000,
            "status": "ACTIVE",
        }

        class Repository:
            async def find_many(self, _query):
                return [vehicle]

        service = VehicleService.__new__(VehicleService)
        service.repository = Repository()

        result = run_immediate_coroutine(service.get_all_vehicles("owner-1"))

        self.assertIsNone(result[0].fuel_type)
        self.assertIsNone(result[0].transmission)
        self.assertIsNone(result[0].plate_number)


if __name__ == "__main__":
    unittest.main()
