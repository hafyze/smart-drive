from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status


class ReceiptStorageService:
    ALLOWED_CONTENT_TYPES = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    def __init__(self):
        self.upload_directory = Path("uploads/receipts")

        self.upload_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

    async def save_file(
        self,
        file: UploadFile,
    ) -> dict:

        # --------------------------------------------------------
        # Validate content type
        # --------------------------------------------------------

        if file.content_type not in self.ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Unsupported file type. "
                    "Only PDF, JPEG, PNG and WEBP are allowed."
                ),
            )

        # --------------------------------------------------------
        # Read file
        # --------------------------------------------------------

        content = await file.read()

        file_size = len(content)

        # --------------------------------------------------------
        # Validate file size
        # --------------------------------------------------------

        if file_size > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Receipt file must not exceed 10 MB.",
            )

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Receipt file is empty.",
            )

        # --------------------------------------------------------
        # Generate safe filename
        # --------------------------------------------------------

        extension = self.ALLOWED_CONTENT_TYPES[
            file.content_type
        ]

        stored_filename = (
            f"{uuid4()}{extension}"
        )

        file_path = (
            self.upload_directory
            / stored_filename
        )

        # --------------------------------------------------------
        # Save file
        # --------------------------------------------------------

        file_path.write_bytes(content)

        return {
            "original_filename": (
                file.filename or "receipt"
            ),
            "stored_filename": stored_filename,
            "file_path": str(file_path),
            "file_url": (
                f"/uploads/receipts/"
                f"{stored_filename}"
            ),
            "content_type": file.content_type,
            "file_size": file_size,
        }

    async def delete_file(
        self,
        stored_filename: str,
    ) -> None:

        file_path = (
            self.upload_directory
            / stored_filename
        )

        if file_path.exists():
            file_path.unlink()