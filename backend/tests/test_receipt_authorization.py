import unittest
from io import BytesIO

from bson import ObjectId
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.services.receipt_service import ReceiptService


class FakeRepository:
    def __init__(self, document):
        self.document = document

    async def find_one(self, _filter):
        return self.document


class FakeStorage:
    def __init__(self):
        self.reads = 0
        self.saves = 0

    async def read_file(self, _file_id):
        self.reads += 1
        return b"receipt"

    async def save_file(self, _file):
        self.saves += 1
        return {"stored_filename": "file-id"}


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The test coroutine unexpectedly waited for I/O")


class ReceiptAuthorizationTests(unittest.TestCase):
    def test_another_user_cannot_read_receipt_file(self):
        receipt = {
            "_id": ObjectId(),
            "user_id": "owner-id",
            "stored_filename": "private-file-id",
            "content_type": "application/pdf",
            "original_filename": "receipt.pdf",
        }
        service = ReceiptService.__new__(ReceiptService)
        service.repository = FakeRepository(receipt)
        service.storage_service = FakeStorage()

        with self.assertRaises(HTTPException) as raised:
            run_immediate_coroutine(
                service.get_receipt_file(str(receipt["_id"]), "other-user-id")
            )

        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(service.storage_service.reads, 0)

    def test_receipt_cannot_be_attached_to_a_different_vehicle_visit(self):
        vehicle_id = ObjectId()
        visit = {
            "_id": ObjectId(),
            "user_id": "owner-id",
            "vehicle_id": ObjectId(),
        }
        service = ReceiptService.__new__(ReceiptService)
        service.vehicle_repository = FakeRepository(
            {"_id": vehicle_id, "user_id": "owner-id", "deleted_at": None}
        )
        service.maintenance_repository = FakeRepository(visit)
        service.storage_service = FakeStorage()
        upload = UploadFile(
            file=BytesIO(b"%PDF-1.7"),
            filename="receipt.pdf",
            headers=Headers({"content-type": "application/pdf"}),
        )

        with self.assertRaises(HTTPException) as raised:
            run_immediate_coroutine(
                service.create_receipt(
                    user_id="owner-id",
                    vehicle_id=str(vehicle_id),
                    file=upload,
                    service_visit_id=str(visit["_id"]),
                )
            )

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(service.storage_service.saves, 0)


if __name__ == "__main__":
    unittest.main()
