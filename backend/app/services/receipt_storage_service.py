from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.services.gridfs_storage_service import GridFSStorageService


class ReceiptStorageService:
    ALLOWED_CONTENT_TYPES = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }
    MAX_FILE_SIZE = 10 * 1024 * 1024

    def __init__(self):
        self.gridfs = GridFSStorageService("receipt_files")
        self.legacy_directory = Path("uploads/receipts")

    async def save_file(self, file: UploadFile) -> dict:
        content_type = file.content_type or ""
        extension = self.ALLOWED_CONTENT_TYPES.get(content_type)
        if extension is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Only PDF, JPEG, PNG and WEBP are allowed.",
            )

        content = await file.read(self.MAX_FILE_SIZE + 1)
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Receipt file must not exceed 10 MB.")
        if not content:
            raise HTTPException(status_code=400, detail="Receipt file is empty.")

        file_id = await self.gridfs.save(
            filename=file.filename or f"receipt{extension}",
            content=content,
            content_type=content_type,
        )
        return {
            "original_filename": file.filename or "receipt",
            "stored_filename": file_id,
            "file_url": f"/receipts/{file_id}/file",
            "content_type": content_type,
            "file_size": len(content),
        }

    async def read_file(self, file_id: str) -> bytes:
        if not self._is_gridfs_id(file_id):
            if Path(file_id).name != file_id:
                raise HTTPException(status_code=404, detail="Receipt file not found.")
            path = self.legacy_directory / file_id
            if not path.is_file():
                raise HTTPException(status_code=404, detail="Receipt file not found.")
            return path.read_bytes()
        return await self.gridfs.read(file_id)

    async def delete_file(self, file_id: str | None) -> None:
        if file_id and not self._is_gridfs_id(file_id):
            if Path(file_id).name == file_id:
                (self.legacy_directory / file_id).unlink(missing_ok=True)
            return
        await self.gridfs.delete(file_id)
    @staticmethod
    def _is_gridfs_id(file_id: str) -> bool:
        from bson import ObjectId

        return ObjectId.is_valid(file_id)
