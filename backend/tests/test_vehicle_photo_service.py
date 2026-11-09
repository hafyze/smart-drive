import unittest
from datetime import datetime, timezone
from io import BytesIO

from bson import ObjectId
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.services.vehicle_service import VehicleService


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The test coroutine unexpectedly waited for I/O")


class FakeStorage:
    def __init__(self):
        self.deleted = []
        self.reads = 0

    async def save(self, _file):
        return "new-gridfs-id", "image/png"

    async def delete(self, file_id):
        if file_id:
            self.deleted.append(file_id)

    async def read(self, _file_id):
        self.reads += 1
        return b"image"


class VehiclePhotoServiceTests(unittest.TestCase):
    def setUp(self):
        self.vehicle_id = ObjectId()
        self.vehicle = {
            "_id": self.vehicle_id,
            "user_id": "owner-1",
            "deleted_at": None,
            "nickname": "Daily",
            "manufacturer": "Perodua",
            "model": "Myvi",
            "variant": "1.5 AV",
            "year": 2023,
            "current_mileage": 10_000,
            "fuel_type": "PETROL",
            "transmission": "AUTOMATIC",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "photo_filename": "old-gridfs-id",
            "photo_content_type": "image/jpeg",
            "photo_url": "/vehicles/photo/photo",
        }
        self.service = VehicleService.__new__(VehicleService)

        class Repository:
            def __init__(inner_self):
                inner_self.document = self.vehicle.copy()

            async def find_one(inner_self, _query):
                return inner_self.document

            async def update(inner_self, _query, update_data):
                inner_self.document.update(update_data)
                return inner_self.document

        self.service.repository = Repository()
        self.service.photo_storage = FakeStorage()

    def test_replacing_photo_updates_vehicle_then_deletes_old_file(self):
        upload = UploadFile(
            file=BytesIO(b"image"),
            filename="new.png",
            headers=Headers({"content-type": "image/png"}),
        )

        result = run_immediate_coroutine(
            self.service.upload_photo(str(self.vehicle_id), "owner-1", upload)
        )

        self.assertEqual(result.photo_url, f"/vehicles/{self.vehicle_id}/photo")
        self.assertEqual(self.service.repository.document["photo_filename"], "new-gridfs-id")
        self.assertEqual(self.service.photo_storage.deleted, ["old-gridfs-id"])

    def test_other_user_is_rejected_before_private_photo_read(self):
        with self.assertRaises(HTTPException) as caught:
            run_immediate_coroutine(
                self.service.get_photo(str(self.vehicle_id), "owner-2")
            )

        self.assertEqual(caught.exception.status_code, 403)
        self.assertEqual(self.service.photo_storage.reads, 0)


if __name__ == "__main__":
    unittest.main()
