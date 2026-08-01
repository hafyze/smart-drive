from bson import ObjectId
from fastapi import HTTPException, status

from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.vehicle import (
    VehicleCreate, VehicleListItem, VehicleResponse, VehicleUpdate
)

class VehicleService:
    def __init__(self):
        self.repository = VehicleRepository()

        @staticmethod
        def _serialize(document: dict) -> dict:
            """
            Convert MongoDB document into JSON
            """

            document["id"] = str(document.pop("_id"))
            document["user_id"] = str(document["user_id"])

            return document

        async def create_vehicle(self, user_id: str, vehicle: VehicleCreate) -> VehicleResponse:
            document = await self.repository.create_vehicle(
                user_id=user_id,
                vehicle=vehicle,
            )

            return VehicleResponse(**self._serialize(document))

        async def get_all_vehicle(self, user_id: str) -> list[VehicleListItem]:
            vehicles = await self.repository.get_all_vehicles(user_id)

            return [
                VehicleListItem(**self._serialize(vehicle))
                for vehicle in vehicles
            ]

        async def get_vehicle(self, vehicle_id: str, user_id: str) -> VehicleResponse:
            vehicle = await self.repository.get_vehicle_by_id(vehicle_id)

            if vehicle is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vehicle not found",
                )
            if vehicle["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No access to vehicle"
                )
            return VehicleResponse(**self._serialize(vehicle))

        async def update_vehicle(self, vehicle_id: str, user_id: str, update: VehicleUpdate) -> VehicleResponse:
            vehicle = await self.repository.get_vehicle_by_id(vehicle_id)

            if vehicle is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vehicle not found",
                )

            if vehicle["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission.",
                )
            updated = await self.repository.update_vehicle(vehicle_id, update)

            return VehicleResponse(**self._serialize(updated))

        async def delete_vehicle(self, vehicle_id: str, user_id: str):
            vehicle = await self.repository.get_vehicle_by_id(vehicle_id)
            if vehicle is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vehicle not found",
                )
            if vehicle["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission",
                )

            deleted = await self.repository.delete_vehicle(vehicle_id)
            return {"success": deleted}