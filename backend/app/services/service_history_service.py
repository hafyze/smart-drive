from collections import defaultdict

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

        # --------------------------------------------------
        # Verify vehicle ownership
        # --------------------------------------------------

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

        # --------------------------------------------------
        # Get maintenance records
        # --------------------------------------------------

        maintenance_records = await self.maintenance_repository.find_many(
            {
                "vehicle_id": vehicle["_id"],
            }
        )

        # --------------------------------------------------
        # Only completed maintenance belongs in history
        # --------------------------------------------------

        completed_records = [
            record
            for record in maintenance_records
            if record.get("status") == MaintenanceStatus.COMPLETED
        ]

        # --------------------------------------------------
        # Group records into service visits
        #
        # Records are considered part of the same visit when
        # they share:
        #
        #   - service date
        #   - mileage
        #   - workshop
        # --------------------------------------------------

        grouped_visits = defaultdict(list)

        for record in completed_records:
            key = (
                record.get("service_date"),
                record.get("mileage_at_service"),
                record.get("workshop"),
            )

            grouped_visits[key].append(record)

        # --------------------------------------------------
        # Build service history response
        # --------------------------------------------------

        service_history: list[ServiceHistoryVisit] = []

        for (
            service_date,
            mileage,
            workshop,
        ), records in grouped_visits.items():

            items: list[ServiceHistoryItem] = []

            total_cost = 0.0
            has_cost = False

            for record in records:
                serialized = serialize_document(record)

                items.append(
                    ServiceHistoryItem(
                        id=serialized["id"],
                        type=serialized["type"],
                        description=serialized.get("description"),
                        cost=serialized.get("cost"),
                        notes=serialized.get("notes"),
                    )
                )

                if serialized.get("cost") is not None:
                    total_cost += serialized["cost"]
                    has_cost = True

            service_history.append(
                ServiceHistoryVisit(
                    vehicle_id=vehicle_id,
                    service_date=service_date.date()
                    if hasattr(service_date, "date")
                    else service_date,
                    mileage=mileage,
                    workshop=workshop,
                    total_cost=total_cost if has_cost else None,
                    items=items,
                )
            )

        # --------------------------------------------------
        # Newest service visit first
        # --------------------------------------------------

        service_history.sort(
            key=lambda visit: visit.service_date,
            reverse=True,
        )

        return service_history