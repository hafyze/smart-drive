import unittest

from bson import ObjectId
from fastapi import HTTPException

from app.services.vehicle_service import VehicleService


class VehicleOwnershipTests(unittest.TestCase):
    VEHICLE_ID = "507f1f77bcf86cd799439011"

    def service_for(self, vehicle):
        service = VehicleService.__new__(VehicleService)

        class Repository:
            async def find_one(self, query):
                self.query = query
                return vehicle

        service.repository = Repository()
        return service

    @staticmethod
    def resolve(coroutine):
        try:
            coroutine.send(None)
        except StopIteration as result:
            return result.value
        raise AssertionError("Expected mocked repository call to complete immediately")

    def test_owner_can_read_active_vehicle(self):
        vehicle = {
            "_id": ObjectId(self.VEHICLE_ID),
            "user_id": "owner-1",
            "deleted_at": None,
        }

        result = self.resolve(
            self.service_for(vehicle)._get_owned_vehicle(self.VEHICLE_ID, "owner-1")
        )

        self.assertEqual(result, vehicle)

    def test_other_user_cannot_read_vehicle(self):
        vehicle = {
            "_id": ObjectId(self.VEHICLE_ID),
            "user_id": "owner-1",
            "deleted_at": None,
        }

        with self.assertRaises(HTTPException) as caught:
            self.resolve(
                self.service_for(vehicle)._get_owned_vehicle(self.VEHICLE_ID, "owner-2")
            )

        self.assertEqual(caught.exception.status_code, 403)

    def test_soft_deleted_vehicle_is_not_readable(self):
        vehicle = {
            "_id": ObjectId(self.VEHICLE_ID),
            "user_id": "owner-1",
            "deleted_at": "deleted",
        }

        with self.assertRaises(HTTPException) as caught:
            self.resolve(
                self.service_for(vehicle)._get_owned_vehicle(self.VEHICLE_ID, "owner-1")
            )

        self.assertEqual(caught.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
