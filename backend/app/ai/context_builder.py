from typing import Any

from fastapi import HTTPException, status

from app.ai.maintenance_analyzer import (
    MaintenanceAnalyzer,
)
from app.ai.schemas import (
    VehicleContext,
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

        return vehicle