import unittest
from io import BytesIO

from bson import ObjectId
from fastapi import UploadFile
from starlette.datastructures import Headers

from app.services.receipt_service import ReceiptService


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The test coroutine unexpectedly waited for I/O")


class FakeLookup:
    def __init__(self, document):
        self.document = document

    async def find_one(self, _query):
        return self.document


class FakeStorage:
    def __init__(self):
        self.deleted = []

    async def save_file(self, _file):
        return {
            "stored_filename": "gridfs-id",
            "original_filename": "receipt.pdf",
            "file_url": "/receipts/gridfs-id/file",
            "content_type": "application/pdf",
            "file_size": 8,
        }

    async def delete_file(self, stored_filename):
        self.deleted.append(stored_filename)


def new_upload():
    return UploadFile(
        file=BytesIO(b"%PDF-1.7"),
        filename="receipt.pdf",
        headers=Headers({"content-type": "application/pdf"}),
    )


class ReceiptServiceTests(unittest.TestCase):
    def setUp(self):
        self.vehicle_id = ObjectId()
        self.visit_id = ObjectId()
        self.vehicle = {
            "_id": self.vehicle_id,
            "user_id": "owner-1",
            "deleted_at": None,
        }
        self.visit = {
            "_id": self.visit_id,
            "user_id": "owner-1",
            "vehicle_id": self.vehicle_id,
        }
        self.service = ReceiptService.__new__(ReceiptService)
        self.service.vehicle_repository = FakeLookup(self.vehicle)
        self.service.maintenance_repository = FakeLookup(self.visit)
        self.service.storage_service = FakeStorage()

    def test_successful_upload_links_receipt_to_same_vehicle_visit(self):
        class Repository:
            async def insert(inner_self, document):
                inner_self.document = {"_id": ObjectId(), **document}
                return inner_self.document

        self.service.repository = Repository()

        result = run_immediate_coroutine(
            self.service.create_receipt(
                user_id="owner-1",
                vehicle_id=str(self.vehicle_id),
                service_visit_id=str(self.visit_id),
                file=new_upload(),
            )
        )

        self.assertEqual(result.vehicle_id, str(self.vehicle_id))
        self.assertEqual(result.service_visit_id, str(self.visit_id))
        self.assertEqual(result.original_filename, "receipt.pdf")
        self.assertEqual(
            self.service.repository.document["stored_filename"],
            "gridfs-id",
        )
        self.assertEqual(self.service.storage_service.deleted, [])

    def test_metadata_insert_failure_deletes_stored_gridfs_file(self):
        class Repository:
            async def insert(self, _document):
                raise RuntimeError("metadata write failed")

        self.service.repository = Repository()

        with self.assertRaisesRegex(RuntimeError, "metadata write failed"):
            run_immediate_coroutine(
                self.service.create_receipt(
                    user_id="owner-1",
                    vehicle_id=str(self.vehicle_id),
                    service_visit_id=str(self.visit_id),
                    file=new_upload(),
                )
            )

        self.assertEqual(self.service.storage_service.deleted, ["gridfs-id"])


if __name__ == "__main__":
    unittest.main()
