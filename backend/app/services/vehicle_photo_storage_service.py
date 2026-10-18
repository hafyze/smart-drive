from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.services.gridfs_storage_service import GridFSStorageService


class VehiclePhotoStorageService:
    MAX_FILE_SIZE = 10 * 1024 * 1024
    ALLOWED_TYPES = {
        "image/jpeg": "JPEG",
        "image/png": "PNG",
        "image/webp": "WEBP",
    }

    def __init__(self):
        self.gridfs = GridFSStorageService("vehicle_photos")
        self.legacy_directory = Path("uploads/vehicle_photos")

    async def save(self, file: UploadFile) -> tuple[str, str]:
        content_type = file.content_type or ""
        expected_format = self.ALLOWED_TYPES.get(content_type)
        if expected_format is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JPEG, PNG and WEBP vehicle photos are supported.",
            )

        content = await file.read(self.MAX_FILE_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="The photo is empty.")
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Photo must be 10 MB or smaller.")

        try:
            image = Image.open(BytesIO(content))
            if image.width * image.height > 40_000_000:
                raise ValueError("Image dimensions are too large")
            image.verify()
            if image.format != expected_format:
                raise ValueError("Image content does not match its file type")
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid JPEG, PNG or WEBP image.",
            )

        file_id = await self.gridfs.save(
            filename=file.filename or "vehicle-photo",
            content=content,
            content_type=content_type,
        )
        return file_id, content_type

    async def read(self, file_id: str) -> bytes:
        from bson import ObjectId

        if not ObjectId.is_valid(file_id):
            if Path(file_id).name != file_id:
                raise HTTPException(status_code=404, detail="Vehicle photo not found.")
            path = self.legacy_directory / file_id
            if not path.is_file():
                raise HTTPException(status_code=404, detail="Vehicle photo not found.")
            return path.read_bytes()
        return await self.gridfs.read(file_id)

    async def delete(self, file_id: str | None) -> None:
        from bson import ObjectId

        if file_id and not ObjectId.is_valid(file_id):
            if Path(file_id).name == file_id:
                (self.legacy_directory / file_id).unlink(missing_ok=True)
            return
        await self.gridfs.delete(file_id)
