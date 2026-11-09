from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

from app.ai.maintenance_analyzer import (
    MaintenanceAnalyzer,
)
from app.ai.schemas import (
    ConversationMaintenanceRecord,
    VehicleContext,
    VehicleConversationContext,
    VehicleMaintenanceContext,
)
from app.ai.vehicle_identity import (
    VehicleIdentityResolver,
)
from app.repositories.maintenance_repository import (
    MaintenanceRepository,
)
from app.repositories.vehicle_repository import (
    VehicleRepository,
)
from app.shared.utils.mongodb import to_object_id


class VehicleContextBuilder:
    def __init__(self):
        self.vehicle_repository = (
            VehicleRepository()
        )

        self.maintenance_repository = (
            MaintenanceRepository()
        )

        self.identity_resolver = (
            VehicleIdentityResolver()
        )

        self.maintenance_analyzer = (
            MaintenanceAnalyzer()
        )

    async def verify_vehicle_access(self, vehicle_id: str, user_id: str) -> str:
        vehicle = await self._get_owned_vehicle(vehicle_id, user_id)
        return str(vehicle["_id"])

    async def build(
        self,
        vehicle_id: str,
        user_id: str,
    ) -> VehicleMaintenanceContext:

        vehicle = await self._get_owned_vehicle(
            vehicle_id,
            user_id,
        )

        service_visits = (
            await self.maintenance_repository.find_many(
                {
                    "vehicle_id": vehicle["_id"],
                    "user_id": user_id,
                }
            )
        )

        identity = (
            self.identity_resolver.resolve(
                vehicle
            )
        )

        maintenance_summary = (
            self.maintenance_analyzer.analyze(
                service_visits,
                current_mileage=vehicle["current_mileage"]
            )
        )

        transmission = vehicle.get(
            "transmission"
        )

        fuel_type = vehicle.get(
            "fuel_type"
        )

        vehicle_context = VehicleContext(
            id=str(vehicle["_id"]),

            manufacturer=vehicle[
                "manufacturer"
            ],
            model=vehicle["model"],
            variant=vehicle.get(
                "variant"
            ),
            year=vehicle["year"],

            current_mileage=vehicle[
                "current_mileage"
            ],
            engine=vehicle.get("engine"),

            fuel_type=(
                str(
                    getattr(
                        fuel_type,
                        "value",
                        fuel_type,
                    )
                    or "unknown"
                )
            ),

            transmission=(
                str(
                    getattr(
                        transmission,
                        "value",
                        transmission,
                    )
                    or "unknown"
                )
            ),

            identity=identity,
        )

        return VehicleMaintenanceContext(
            vehicle=vehicle_context,
            maintenance=maintenance_summary,
        )

    async def build_conversation_context(
        self,
        vehicle_id: str,
        user_id: str,
        max_records: int = 60,
    ) -> VehicleConversationContext:
        vehicle = await self._get_owned_vehicle(vehicle_id, user_id)
        visits = await self.maintenance_repository.find_many({
            "vehicle_id": vehicle["_id"],
            "user_id": user_id,
        })
        visits.sort(key=lambda visit: str(visit.get("service_date") or ""), reverse=True)
        summary = self.maintenance_analyzer.analyze(
            visits,
            current_mileage=vehicle["current_mileage"],
        )

        records: list[ConversationMaintenanceRecord] = []
        total_records = 0
        for visit in visits:
            service_date = visit.get("service_date")
            if service_date is None:
                continue
            items = visit.get("items", [])
            total_records += len(items)
            for index, item in enumerate(items):
                if len(records) >= max_records:
                    continue
                item_type = item.get("type")
                if hasattr(item_type, "value"):
                    item_type = item_type.value
                if not item_type:
                    continue
                records.append(ConversationMaintenanceRecord(
                    reference=f"{visit['_id']}:{index}",
                    service_date=service_date.date() if isinstance(service_date, datetime) else service_date,
                    mileage_at_service=visit.get("mileage_at_service"),
                    type=str(item_type),
                    description=str(item["description"])[:500] if item.get("description") else None,
                    next_due_date=item.get("next_due_date"),
                    next_due_mileage=item.get("next_due_mileage"),
                ))

        identity = self.identity_resolver.resolve(vehicle)
        fuel_type = vehicle.get("fuel_type")
        transmission = vehicle.get("transmission")
        context_vehicle = VehicleContext(
            id=str(vehicle["_id"]),
            manufacturer=vehicle["manufacturer"],
            model=vehicle["model"],
            variant=vehicle.get("variant"),
            year=vehicle["year"],
            current_mileage=vehicle["current_mileage"],
            engine=vehicle.get("engine"),
            fuel_type=str(getattr(fuel_type, "value", fuel_type) or "unknown"),
            transmission=str(getattr(transmission, "value", transmission) or "unknown"),
            identity=identity,
        )
        return VehicleConversationContext(
            vehicle=context_vehicle,
            maintenance_summary=summary,
            maintenance_records=records,
            history_truncated=total_records > max_records,
        )

    async def _get_owned_vehicle(
        self,
        vehicle_id: str,
        user_id: str,
    ) -> dict[str, Any]:

        vehicle = (
            await self.vehicle_repository.find_one(
                {
                    "_id": to_object_id(
                        vehicle_id
                    )
                }
            )
        )

        if vehicle is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail="Vehicle not found.",
            )

        if (
            str(vehicle["user_id"])
            != user_id
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail="Access denied.",
            )

        if vehicle.get("deleted_at") is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found.",
            )

        return vehicle
