from fastapi import HTTPException, status

from app.repositories.maintenance_repository import MaintenanceRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.maintenance import MaintenanceStatus
from app.schemas.service_history import (
    ServiceHistoryItem,
    ServiceHistoryVisit,
)
from app.shared.utils.mongodb import to_object_id
from app.shared.utils.serialization import serialize_document


class ServiceHistoryService:
    def __init__(self):
        self.maintenance_repository = MaintenanceRepository()
        self.vehicle_repository = VehicleRepository()

    async def get_vehicle_service_history(
        self,
        vehicle_id: str,
        user_id: str,
    ) -> list[ServiceHistoryVisit]:

        vehicle = await self.vehicle_repository.find_one(
            {
                "_id": to_object_id(vehicle_id),
            }
        )

        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found",
            )

        if str(vehicle["user_id"]) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        service_visits = await self.maintenance_repository.find_many(
            {
                "vehicle_id": vehicle["_id"],
                "user_id": user_id,
            }
        )

        service_history: list[ServiceHistoryVisit] = []

        for visit in service_visits:
            serialized_visit = serialize_document(visit)

            items: list[ServiceHistoryItem] = []
            total_cost = 0.0
            has_cost = False

            for item in serialized_visit.get("items", []):
                if item.get("status") != MaintenanceStatus.COMPLETED:
                    continue

                items.append(
                    ServiceHistoryItem(
                        id=item["id"],
                        type=item["type"],
                        description=item.get("description"),
                        cost=item.get("cost"),
                        notes=item.get("notes"),
                    )
                )

                if item.get("cost") is not None:
                    total_cost += item["cost"]
                    has_cost = True

            if not items:
                continue

            service_date = serialized_visit["service_date"]

            service_history.append(
                ServiceHistoryVisit(
                    id=serialized_visit["id"],
                    vehicle_id=vehicle_id,
                    service_date=service_date.date()
                    if hasattr(service_date, "date")
                    else service_date,
                    mileage=serialized_visit["mileage_at_service"],
                    workshop=serialized_visit.get("workshop"),
                    notes=serialized_visit.get("notes"),
                    total_cost=total_cost if has_cost else None,
                    items=items,
                )
            )

        service_history.sort(
            key=lambda visit: visit.service_date,
            reverse=True,
        )

        return service_history
