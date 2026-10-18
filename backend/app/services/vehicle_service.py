from datetime import date, datetime, timezone
from typing import Any


from fastapi import HTTPException, UploadFile, status

from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleListItem,
    VehicleResponse,
    VehicleStatus,
    VehicleUpdate,
)
from app.shared.utils.mongodb import to_object_id
from app.shared.utils.serialization import serialize_document
from app.services.vehicle_photo_storage_service import VehiclePhotoStorageService


class VehicleService:
    def __init__(self):
        self.repository = VehicleRepository()
        self.photo_storage = VehiclePhotoStorageService()

    # Create
    async def create_vehicle(self,user_id: str,vehicle: VehicleCreate,) -> VehicleResponse:

        now = datetime.now(timezone.utc)

        document = vehicle.model_dump()
        document = self._serialize_update_data(document)

        document["user_id"] = user_id
        document["status"] = VehicleStatus.ACTIVE
        document["created_at"] = now
        document["updated_at"] = now

        created = await self.repository.insert(document)

        serialized = serialize_document(created)

        return VehicleResponse.model_validate(serialized)

    # GET All
    async def get_all_vehicles(self,user_id: str,) -> list[VehicleListItem]:

        vehicles = await self.repository.find_many(
            {
                "user_id": user_id,
                "deleted_at": None,
            }
        )

        return [
            VehicleListItem.model_validate(
                serialize_document(vehicle)
            )
            for vehicle in vehicles
        ]

    # GET ONE 
    async def get_vehicle(self,vehicle_id: str,user_id: str,) -> VehicleResponse:

        vehicle = await self._get_owned_vehicle(vehicle_id, user_id)
        serialized = serialize_document(vehicle)

        return VehicleResponse.model_validate(serialized)

    # UPDATE
    async def update_vehicle(self,vehicle_id: str,user_id: str,update: VehicleUpdate,) -> VehicleResponse:

        vehicle = await self._get_owned_vehicle(vehicle_id, user_id)

        update_data = update.model_dump(
            exclude_none=True,
            exclude_unset=True,
        )

        update_data = self._serialize_update_data(update_data)

        update_data["updated_at"] = datetime.now(
            timezone.utc
        )

        updated = await self.repository.update(
            {
                "_id": vehicle["_id"]
            },
            update_data,
        )

        serialized = serialize_document(updated)

        return VehicleResponse.model_validate(serialized)

    # DELETE
    async def delete_vehicle(self,vehicle_id: str,user_id: str,) -> dict:

        vehicle = await self._get_owned_vehicle(vehicle_id, user_id)

        now = datetime.now(timezone.utc)
        updated = await self.repository.update(
            {
                "_id": vehicle["_id"],
                "user_id": user_id,
            },
            {
                "deleted_at": now,
                "updated_at": now,
            }
        )

        if updated is not None:
            await self.photo_storage.delete(vehicle.get("photo_filename"))

        return {
            "success": updated is not None
        }

    async def upload_photo(
        self, vehicle_id: str, user_id: str, file: UploadFile
    ) -> VehicleResponse:
        vehicle = await self._get_owned_vehicle(vehicle_id, user_id)
        filename, content_type = await self.photo_storage.save(file)
        old_filename = vehicle.get("photo_filename")
        try:
            updated = await self.repository.update(
                {"_id": vehicle["_id"]},
                {
                    "photo_filename": filename,
                    "photo_content_type": content_type,
                    "photo_url": f"/vehicles/{vehicle_id}/photo",
                    "updated_at": datetime.now(timezone.utc),
                },
            )
        except Exception:
            await self.photo_storage.delete(filename)
            raise
        if updated is None:
            await self.photo_storage.delete(filename)
            raise HTTPException(status_code=500, detail="Unable to save vehicle photo.")
        await self.photo_storage.delete(old_filename)
        return VehicleResponse.model_validate(serialize_document(updated))

    async def delete_photo(self, vehicle_id: str, user_id: str) -> VehicleResponse:
        vehicle = await self._get_owned_vehicle(vehicle_id, user_id)
        old_filename = vehicle.get("photo_filename")
        updated = await self.repository.update(
            {"_id": vehicle["_id"]},
            {
                "photo_filename": None,
                "photo_content_type": None,
                "photo_url": None,
                "updated_at": datetime.now(timezone.utc),
            },
        )
        if updated is None:
            raise HTTPException(status_code=500, detail="Unable to remove vehicle photo.")
        await self.photo_storage.delete(old_filename)
        return VehicleResponse.model_validate(serialize_document(updated))

    async def get_photo(self, vehicle_id: str, user_id: str):
        vehicle = await self._get_owned_vehicle(vehicle_id, user_id)
        filename = vehicle.get("photo_filename")
        if not filename:
            raise HTTPException(status_code=404, detail="Vehicle photo not found.")
        content = await self.photo_storage.read(filename)
        return content, vehicle.get("photo_content_type") or "application/octet-stream"

    # Private Helper:
    async def _get_owned_vehicle(self, vehicle_id: str, user_id: str) -> dict[str, Any]:
        vehicle = await self.repository.find_one(
            {"_id": to_object_id(vehicle_id)}
        )

        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found.",
            )
        if str(vehicle["user_id"]) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

        if vehicle.get("deleted_at") is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found.",
            )

        return vehicle

    @staticmethod
    def _serialize_update_data(update_data: dict) -> dict:
        for key, value in update_data.items():
            if isinstance(value, date) and not isinstance(value, datetime):
                update_data[key] = datetime.combine(
                    value,
                    datetime.min.time(),
                    tzinfo=timezone.utc,
                )

        return update_data
