from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.repositories.maintenance_repository import MaintenanceRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.maintenance import (
    MaintenanceItemResponse,
    MaintenanceScheduleStatus,
    MaintenanceStatus,
    ServiceVisitCreate,
    ServiceVisitResponse,
)
from app.services.maintenance_status import calculate_maintenance_status
from app.shared.utils.mongodb import to_object_id
from app.shared.utils.serialization import serialize_document


class MaintenanceService:
    def __init__(self):
        self.repository = MaintenanceRepository()
        self.vehicle_repository = VehicleRepository()

    # ============================================================
    # CREATE SERVICE VISIT
    # ============================================================

    async def create_service_visit(
        self,
        user_id: str,
        service_visit: ServiceVisitCreate,
    ) -> ServiceVisitResponse:

        # --------------------------------------------------------
        # Make sure the vehicle belongs to the current user
        # --------------------------------------------------------

        vehicle = await self._get_owned_vehicle(
            service_visit.vehicle_id,
            user_id,
        )

        now = datetime.now(timezone.utc)

        # --------------------------------------------------------
        # Create the service visit ID
        #
        # The service visit itself is the parent record.
        # Each maintenance item is stored inside the visit.
        # --------------------------------------------------------

        from bson import ObjectId

        service_visit_id = ObjectId()

        created_items = []

        # --------------------------------------------------------
        # Process each maintenance item
        # --------------------------------------------------------

        for item in service_visit.items:

            item_document = item.model_dump()

            # Convert date values into MongoDB-compatible datetime
            item_document = self._serialize_update_data(
                item_document
            )

            # ----------------------------------------------------
            # Calculate schedule status
            # ----------------------------------------------------

            next_due_date = item_document.get("next_due_date")

            if isinstance(next_due_date, datetime):
                next_due_date = next_due_date.date()

            schedule_status = calculate_maintenance_status(
                maintenance_type=item.type,
                next_due_date=next_due_date,
                next_due_mileage=item_document.get(
                    "next_due_mileage"
                ),
                current_mileage=vehicle["current_mileage"],
            )

            # ----------------------------------------------------
            # Build maintenance item
            # ----------------------------------------------------

            item_document["id"] = str(ObjectId())

            item_document["status"] = MaintenanceStatus.COMPLETED

            item_document["schedule_status"] = schedule_status

            created_items.append(
                item_document
            )

        # --------------------------------------------------------
        # Create ONE service visit document
        # --------------------------------------------------------

        service_visit_document = {
            "_id": service_visit_id,
            "user_id": user_id,
            "vehicle_id": vehicle["_id"],
            "service_date": service_visit.service_date,
            "mileage_at_service": service_visit.mileage_at_service,
            "workshop": service_visit.workshop,
            "notes": service_visit.notes,
            "items": created_items,
            "created_at": now,
            "updated_at": now,
        }

        # Convert service date to MongoDB datetime
        service_visit_document = self._serialize_update_data(
            service_visit_document
        )

        created = await self.repository.insert(
            service_visit_document
        )

        serialized = serialize_document(created)

        return ServiceVisitResponse.model_validate(
            serialized
        )

    # ============================================================
    # GET ALL SERVICE VISITS
    # ============================================================

    async def get_all_service_visits(
        self,
        user_id: str,
        vehicle_id: str | None = None,
    ) -> list[ServiceVisitResponse]:

        filter_query = {
            "user_id": user_id,
        }

        # --------------------------------------------------------
        # Optional vehicle filter
        # --------------------------------------------------------

        if vehicle_id is not None:

            vehicle = await self._get_owned_vehicle(
                vehicle_id,
                user_id,
            )

            filter_query["vehicle_id"] = vehicle["_id"]

        # --------------------------------------------------------
        # Get service visits
        # --------------------------------------------------------

        service_visits = await self.repository.find_many(
            filter_query
        )

        # --------------------------------------------------------
        # Get current mileage for the relevant vehicles
        #
        # Schedule status depends on current mileage, so we
        # recalculate it when retrieving the records.
        # --------------------------------------------------------

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

        # --------------------------------------------------------
        # Recalculate schedule status for every item
        # --------------------------------------------------------

        for visit in service_visits:

            current_mileage = vehicle_mileage.get(
                str(visit["vehicle_id"])
            )

            if current_mileage is None:
                continue

            items = []

            for item in visit.get("items", []):

                next_due_date = item.get(
                    "next_due_date"
                )

                if isinstance(next_due_date, datetime):
                    next_due_date = next_due_date.date()

                schedule_status = calculate_maintenance_status(
                    maintenance_type=item["type"],
                    next_due_date=next_due_date,
                    next_due_mileage=item.get(
                        "next_due_mileage"
                    ),
                    current_mileage=current_mileage,
                )

                item["status"] = MaintenanceStatus.COMPLETED
                item["schedule_status"] = schedule_status

                items.append(
                    MaintenanceItemResponse.model_validate(
                        serialize_document(item)
                    )
                )

            serialized = serialize_document(visit)

            serialized["items"] = items

            result.append(
                ServiceVisitResponse.model_validate(
                    serialized
                )
            )

        # --------------------------------------------------------
        # Newest service visit first
        # --------------------------------------------------------

        result.sort(
            key=lambda visit: visit.service_date,
            reverse=True,
        )

        return result

    # ============================================================
    # GET ONE SERVICE VISIT
    # ============================================================

    async def get_service_visit(
        self,
        service_visit_id: str,
        user_id: str,
    ) -> ServiceVisitResponse:

        service_visit = await self._get_owned_service_visit(
            service_visit_id,
            user_id,
        )

        vehicle = await self._get_owned_vehicle(
            str(service_visit["vehicle_id"]),
            user_id,
        )

        current_mileage = vehicle["current_mileage"]

        # --------------------------------------------------------
        # Recalculate schedule status
        # --------------------------------------------------------

        items = []

        for item in service_visit.get("items", []):

            next_due_date = item.get(
                "next_due_date"
            )

            if isinstance(next_due_date, datetime):
                next_due_date = next_due_date.date()

            schedule_status = calculate_maintenance_status(
                maintenance_type=item["type"],
                next_due_date=next_due_date,
                next_due_mileage=item.get(
                    "next_due_mileage"
                ),
                current_mileage=current_mileage,
            )

            item["status"] = MaintenanceStatus.COMPLETED
            item["schedule_status"] = schedule_status

            items.append(
                MaintenanceItemResponse.model_validate(
                    serialize_document(item)
                )
            )

        serialized = serialize_document(
            service_visit
        )

        serialized["items"] = items

        return ServiceVisitResponse.model_validate(
            serialized
        )

    # ============================================================
    # UPDATE SERVICE VISIT
    # ============================================================

    async def update_service_visit(
        self,
        service_visit_id: str,
        user_id: str,
        service_visit: ServiceVisitCreate,
    ) -> ServiceVisitResponse:

        existing = await self._get_owned_service_visit(
            service_visit_id,
            user_id,
        )

        # --------------------------------------------------------
        # Make sure the target vehicle belongs to the user
        # --------------------------------------------------------

        vehicle = await self._get_owned_vehicle(
            service_visit.vehicle_id,
            user_id,
        )

        now = datetime.now(timezone.utc)

        updated_items = []

        # --------------------------------------------------------
        # Rebuild the maintenance items
        # --------------------------------------------------------

        for item in service_visit.items:

            item_document = item.model_dump()

            item_document = self._serialize_update_data(
                item_document
            )

            next_due_date = item_document.get(
                "next_due_date"
            )

            if isinstance(next_due_date, datetime):
                next_due_date = next_due_date.date()

            schedule_status = calculate_maintenance_status(
                maintenance_type=item.type,
                next_due_date=next_due_date,
                next_due_mileage=item_document.get(
                    "next_due_mileage"
                ),
                current_mileage=vehicle["current_mileage"],
            )

            from bson import ObjectId

            item_document["id"] = str(
                ObjectId()
            )

            item_document["status"] = (
                MaintenanceStatus.COMPLETED
            )

            item_document["schedule_status"] = (
                schedule_status
            )

            updated_items.append(
                item_document
            )

        # --------------------------------------------------------
        # Update ONE service visit
        # --------------------------------------------------------

        update_data = {
            "vehicle_id": vehicle["_id"],
            "service_date": service_visit.service_date,
            "mileage_at_service": service_visit.mileage_at_service,
            "workshop": service_visit.workshop,
            "notes": service_visit.notes,
            "items": updated_items,
            "updated_at": now,
        }

        update_data = self._serialize_update_data(
            update_data
        )

        updated = await self.repository.update(
            {
                "_id": existing["_id"],
            },
            update_data,
        )

        serialized = serialize_document(
            updated
        )

        return ServiceVisitResponse.model_validate(
            serialized
        )

    # ============================================================
    # DELETE SERVICE VISIT
    # ============================================================

    async def delete_service_visit(
        self,
        service_visit_id: str,
        user_id: str,
    ) -> dict:

        service_visit = await self._get_owned_service_visit(
            service_visit_id,
            user_id,
        )

        deleted = await self.repository.delete(
            {
                "_id": service_visit["_id"],
            }
        )

        return {
            "success": deleted
        }

    # ============================================================
    # PRIVATE: GET OWNED VEHICLE
    # ============================================================

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

    # ============================================================
    # PRIVATE: GET OWNED SERVICE VISIT
    # ============================================================

    async def _get_owned_service_visit(
        self,
        service_visit_id: str,
        user_id: str,
    ) -> dict[str, Any]:

        service_visit = await self.repository.find_one(
            {
                "_id": to_object_id(
                    service_visit_id
                ),
            }
        )

        if service_visit is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service visit not found.",
            )

        if str(service_visit["user_id"]) != user_id:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

        return service_visit

    # ============================================================
    # PRIVATE: SERIALIZE DATE VALUES
    # ============================================================

    @staticmethod
    def _serialize_update_data(
        update_data: dict,
    ) -> dict:

        for key, value in update_data.items():

            if (
                isinstance(value, date)
                and not isinstance(value, datetime)
            ):
                update_data[key] = datetime.combine(
                    value,
                    datetime.min.time(),
                    tzinfo=timezone.utc,
                )

        return update_data