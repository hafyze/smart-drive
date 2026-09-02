from typing import Any

from fastapi import HTTPException, status

from app.repositories.maintenance_repository import MaintenanceRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.maintenance import MaintenanceListItem
from app.shared.utils.mongodb import to_object_id
from app.shared.utils.serialization import serialize_document

class ServiceHistory:
    def __init__(self):
        self.maintenance_repository = MaintenanceRepository()
        self.vehicle_repository = VehicleRepository()

    async def get_vehicle_service_history(self, vehicle_id: str, user_id: str) -> list[MaintenanceListItem]:
        vehicle = await self.vehicle_repository.find_one(
            {
                "_id": to_object_id(vehicle_id),
            }
        )

        if vehicle is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

        if str(vehicle["user_id"]) != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        maintenance_records = await self.maintenance_repository.find_many(
            {
                "vehicle_id": vehicle["_id"],
            }
        )

        # only completed maintenance belongs in service history
        completed_records = [
            record 
            for record in maintenance_records
            if record.get("status") == "COMPLETED"
        ]

        #new service first
        completed_records.sort(
            key=lambda record: record.get("service_date"), reverse=True,
        )

        return[
            MaintenanceListItem.model_validate(serialize_document(record))
            for record in completed_records
        ]