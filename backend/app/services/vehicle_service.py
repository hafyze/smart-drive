from datetime import datetime, timezone
from typing import Any


from fastapi import HTTPException, status

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


class VehicleService:
    def __init__(self):
        self.repository = VehicleRepository()

    # Create
    async def create_vehicle(self,user_id: str,vehicle: VehicleCreate,) -> VehicleResponse:

        now = datetime.now(timezone.utc)

        document = vehicle.model_dump()

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
                "user_id": user_id
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

        deleted = await self.repository.delete(
            {
                "_id": vehicle["_id"]
            }
        )

        return {
            "success": deleted
        }

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
        return vehicle