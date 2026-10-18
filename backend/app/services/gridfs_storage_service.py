from io import BytesIO
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status
from gridfs.errors import NoFile
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from app.db.mongodb import get_database


class GridFSStorageService:
    """Private file storage backed by MongoDB GridFS."""

    def __init__(self, bucket_name: str):
        self.bucket = AsyncIOMotorGridFSBucket(
            get_database(), bucket_name=bucket_name
        )

    async def save(
        self,
        filename: str,
        content: bytes,
        content_type: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        file_id = await self.bucket.upload_from_stream(
            filename,
            BytesIO(content),
            metadata={"content_type": content_type, **(metadata or {})},
        )
        return str(file_id)

    async def read(self, file_id: str) -> bytes:
        try:
            object_id = self._object_id(file_id)
            stream = await self.bucket.open_download_stream(object_id)
            return await stream.read()
        except (NoFile, ValueError):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stored file not found.",
            )

    async def delete(self, file_id: str | None) -> None:
        if not file_id:
            return
        try:
            await self.bucket.delete(self._object_id(file_id))
        except (NoFile, ValueError):
            # A missing old file should not prevent replacing/removing a record.
            return

    @staticmethod
    def _object_id(file_id: str) -> ObjectId:
        if not ObjectId.is_valid(file_id):
            raise ValueError("Invalid GridFS file id")
        return ObjectId(file_id)
