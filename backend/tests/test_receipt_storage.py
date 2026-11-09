import unittest
from io import BytesIO

from fastapi import HTTPException
from PIL import Image

from app.services.receipt_storage_service import ReceiptStorageService


class FakeGridFS:
    def __init__(self):
        self.saved = []

    async def save(self, **kwargs):
        self.saved.append(kwargs)
        return "stored-file-id"


class FakeUpload:
    def __init__(self, content: bytes, content_type: str):
        self.stream = BytesIO(content)
        self.content_type = content_type
        self.filename = "service-receipt"

    async def read(self, size: int):
        return self.stream.read(size)


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The test coroutine unexpectedly waited for I/O")


def make_upload(content: bytes, content_type: str) -> FakeUpload:
    return FakeUpload(content, content_type)


class ReceiptStorageTests(unittest.TestCase):
    def setUp(self):
        self.service = ReceiptStorageService.__new__(ReceiptStorageService)
        self.service.gridfs = FakeGridFS()

    def test_accepts_matching_pdf_signature(self):
        result = run_immediate_coroutine(
            self.service.save_file(make_upload(b"%PDF-1.7\nreceipt", "application/pdf"))
        )

        self.assertEqual(result["stored_filename"], "stored-file-id")
        self.assertEqual(result["content_type"], "application/pdf")
        self.assertEqual(len(self.service.gridfs.saved), 1)

    def test_rejects_mismatched_file_signature(self):
        with self.assertRaises(HTTPException) as raised:
            run_immediate_coroutine(
                self.service.save_file(make_upload(b"%PDF-1.7\nreceipt", "image/png"))
            )

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(self.service.gridfs.saved, [])

    def test_accepts_valid_png_image(self):
        image_data = BytesIO()
        Image.new("RGB", (2, 2), color="white").save(image_data, format="PNG")

        result = run_immediate_coroutine(
            self.service.save_file(make_upload(image_data.getvalue(), "image/png"))
        )

        self.assertEqual(result["content_type"], "image/png")

    def test_rejects_empty_unsupported_and_oversized_files(self):
        invalid_uploads = [
            (make_upload(b"", "application/pdf"), "empty"),
            (make_upload(b"GIF89a", "image/gif"), "unsupported"),
            (
                make_upload(b"%PDF-1.7" + b"x" * self.service.MAX_FILE_SIZE, "application/pdf"),
                "oversized",
            ),
        ]

        for upload, case in invalid_uploads:
            with self.subTest(case=case):
                with self.assertRaises(HTTPException) as raised:
                    run_immediate_coroutine(self.service.save_file(upload))
                self.assertEqual(raised.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
