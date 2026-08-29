from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.repositories.maintenance_repository import MaintenanceRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceResponse,
    MaintenanceStatus,
    MaintenanceListItem,
    MaintenanceUpdate,
)
from app.shared.utils.mongodb import to_object_id
from app.shared.utils.serialization import serialize_document
from app.services.maintenance_status import calculate_maintenance_status


class MaintenanceService:
    def __init__(self):
        self.repository = MaintenanceRepository()
        self.vehicle_repository = VehicleRepository()

    # Create
    async def create_maintenance(
        self,
        user_id: str,
        maintenance: MaintenanceCreate,
    ) -> MaintenanceResponse:

        vehicle = await self._get_owned_vehicle(
            maintenance.vehicle_id,
            user_id,
        )

        now = datetime.now(timezone.utc)

        document = maintenance.model_dump(
            exclude={"vehicle_id"},
        )

        document = self._serialize_update_data(document)

        schedule_status = calculate_maintenance_status(
            maintenance_type=maintenance.type,
            next_due_date=maintenance.next_due_date,
            next_due_mileage=maintenance.next_due_mileage,
            current_mileage=vehicle["current_mileage"],
        )

        document["user_id"] = user_id
        document["vehicle_id"] = vehicle["_id"]
        document["status"] = MaintenanceStatus.COMPLETED
        document["schedule_status"] = schedule_status
        document["created_at"] = now
        document["updated_at"] = now

        created = await self.repository.insert(document)

        serialized = serialize_document(created)

        return MaintenanceResponse.model_validate(serialized)

    #Get all
    async def get_all_maintenance(
        self,
        user_id: str,
        vehicle_id: str | None = None,
    ) -> list[MaintenanceListItem]:
        filter_query = {
            "user_id": user_id,
        }

        if vehicle_id is not None:
            vehicle = await self._get_owned_vehicle(
                vehicle_id,
                user_id,
            )

            filter_query["vehicle_id"] = vehicle["_id"]

        maintenance_records = await self.repository.find_many(
            filter_query
        )

        vehicles = await self.vehicle_repository.find_many(
            {
                "user_id": user_id,
            }
        )

        vehicle_mileage = {
            str(vehicle["_id"]): vehicle["current_mileage"]
            for vehicle in vehicles
        }

        result = []

        for record in maintenance_records:
            current_mileage = vehicle_mileage.get(
                str(record["vehicle_id"])
            )

            if current_mileage is None:
                # This should normally never happen because
                # maintenance records belong to the user's vehicles.
                continue

            next_due_date = record.get("next_due_date")

            schedule_status = calculate_maintenance_status(
                maintenance_type=record["type"],
                next_due_date=(
                    next_due_date.date()
                    if next_due_date
                    else None
                ),
                next_due_mileage=record.get("next_due_mileage"),
                current_mileage=current_mileage,
            )

            serialized = serialize_document(record)
            serialized["status"] = MaintenanceStatus.COMPLETED
            serialized["schedule_status"] = schedule_status

            result.append(
                MaintenanceListItem.model_validate(serialized)
            )

        return result
    
    #Get one
    async def get_maintenance(
        self,
        maintenance_id: str,
        user_id: str,
    ) -> MaintenanceResponse:

        maintenance = await self._get_owned_maintenance(
            maintenance_id,
            user_id,
        )

        vehicle = await self._get_owned_vehicle(
            str(maintenance["vehicle_id"]),
            user_id,
        )

        next_due_date = maintenance.get("next_due_date")

        schedule_status = calculate_maintenance_status(
            maintenance_type=maintenance["type"],
            next_due_date=(
                next_due_date.date()
                if next_due_date
                else None
            ),
            next_due_mileage=maintenance.get("next_due_mileage"),
            current_mileage=vehicle["current_mileage"],
        )

        serialized = serialize_document(maintenance)

        serialized["status"] = MaintenanceStatus.COMPLETED
        serialized["schedule_status"] = schedule_status

        return MaintenanceResponse.model_validate(serialized)

    # Update
    async def update_maintenance(
        self,
        maintenance_id: str,
        user_id: str,
        update: MaintenanceUpdate,
    ) -> MaintenanceResponse:
        maintenance = await self._get_owned_maintenance(
            maintenance_id,
            user_id
        )

        update_data = update.model_dump(
            exclude_none=True,
            exclude_unset=True,
        )
        update_data = self._serialize_update_data(update_data)
        maintenance_type = update.type or maintenance["type"]

        next_due_date = (
            update.next_due_date
            if update.next_due_date is not None
            else maintenance.get("next_due_date")
        )

        next_due_mileage = (
            update.next_due_mileage
            if update.next_due_mileage is not None
            else maintenance.get("next_due_mileage")
        )

        # Get the current vehicle mileage because the maintenance
        # status depends on the vehicle's current mileage.
        vehicle = await self._get_owned_vehicle(
            str(maintenance["vehicle_id"]),
            user_id,
        )

        schedule_status = calculate_maintenance_status(
            maintenance_type=maintenance_type,
            next_due_date=next_due_date,
            next_due_mileage=next_due_mileage,
            current_mileage=vehicle["current_mileage"],
        )

        update_data["status"] = MaintenanceStatus.COMPLETED
        update_data["schedule_status"] = schedule_status
        update_data["updated_at"] = datetime.now(timezone.utc)
        updated = await self.repository.update(
            {
                "_id": maintenance["_id"]
            },
            update_data,
        )
        serialized = serialize_document(updated)

        return MaintenanceResponse.model_validate(serialized)

    # Delete
    async def delete_maintenance(
        self,
        maintenace_id: str,
        user_id: str,
    ) -> dict:
        maintenance = await self._get_owned_maintenance(
            maintenace_id,
            user_id
        )

        deleted = await self.repository.delete(
            {
                "_id": maintenance["_id"]
            }
        )
        return{
            "success": deleted
        }

    # Private Helper
    async def _get_owned_vehicle(
        self,
        vehicle_id: str,
        user_id: str,
    ) -> dict[str, Any]:

        vehicle = await self.vehicle_repository.find_one(
            {
                "_id": to_object_id(vehicle_id),
            }
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

    # Private Helper
    async def _get_owned_maintenance(
        self,
        maintenance_id: str,
        user_id: str,
    ) -> dict[str, Any]:

        maintenance = await self.repository.find_one(
            {
                "_id": to_object_id(maintenance_id),
            }
        )

        if maintenance is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maintenance record not found.",
            )

        if str(maintenance["user_id"]) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

        return maintenance

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