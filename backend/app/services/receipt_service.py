from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, UploadFile, status

from app.repositories.maintenance_repository import (
    MaintenanceRepository,
)
from app.repositories.receipt_repository import (
    ReceiptRepository,
)
from app.repositories.vehicle_repository import (
    VehicleRepository,
)
from app.schemas.receipt import (
    ReceiptResponse,
    ReceiptUpdate,
)
from app.services.receipt_storage_service import (
    ReceiptStorageService,
)
from app.shared.utils.mongodb import to_object_id
from app.shared.utils.serialization import (
    serialize_document,
)


class ReceiptService:
    def __init__(self):
        self.repository = ReceiptRepository()

        self.vehicle_repository = (
            VehicleRepository()
        )

        self.maintenance_repository = (
            MaintenanceRepository()
        )

        self.storage_service = (
            ReceiptStorageService()
        )

    # ============================================================
    # CREATE RECEIPT
    # ============================================================

    async def create_receipt(
        self,
        user_id: str,
        vehicle_id: str,
        file: UploadFile,
        service_visit_id: str | None = None,
        notes: str | None = None,
    ) -> ReceiptResponse:

        # --------------------------------------------------------
        # Validate vehicle ownership
        # --------------------------------------------------------

        vehicle = await self._get_owned_vehicle(
            vehicle_id,
            user_id,
        )

        # --------------------------------------------------------
        # Validate service visit if supplied
        # --------------------------------------------------------

        service_visit = None

        if service_visit_id is not None:

            service_visit = (
                await self._get_owned_service_visit(
                    service_visit_id,
                    user_id,
                )
            )

            # Make sure visit belongs to the same vehicle
            if (
                str(service_visit["vehicle_id"])
                != str(vehicle["_id"])
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Service visit does not "
                        "belong to this vehicle."
                    ),
                )

        # --------------------------------------------------------
        # Save physical file
        # --------------------------------------------------------

        stored_file = (
            await self.storage_service.save_file(
                file
            )
        )

        now = datetime.now(timezone.utc)

        # --------------------------------------------------------
        # Create receipt document
        # --------------------------------------------------------

        receipt_document = {
            "user_id": user_id,
            "vehicle_id": vehicle["_id"],
            "service_visit_id": (
                service_visit["_id"]
                if service_visit
                else None
            ),
            "original_filename": (
                stored_file[
                    "original_filename"
                ]
            ),
            "stored_filename": (
                stored_file[
                    "stored_filename"
                ]
            ),
            "file_url": stored_file["file_url"],
            "content_type": (
                stored_file["content_type"]
            ),
            "file_size": stored_file["file_size"],
            "notes": notes,
            "created_at": now,
            "updated_at": now,
        }

        try:

            created = await self.repository.insert(
                receipt_document
            )

        except Exception:

            # Rollback physical file if DB insert fails
            await self.storage_service.delete_file(
                stored_file[
                    "stored_filename"
                ]
            )

            raise

        serialized = serialize_document(
            created
        )

        return ReceiptResponse.model_validate(
            serialized
        )

    # ============================================================
    # GET ALL RECEIPTS
    # ============================================================

    async def get_all_receipts(
        self,
        user_id: str,
        vehicle_id: str | None = None,
        service_visit_id: str | None = None,
    ) -> list[ReceiptResponse]:

        filter_query = {
            "user_id": user_id,
        }

        if vehicle_id is not None:

            vehicle = await self._get_owned_vehicle(
                vehicle_id,
                user_id,
            )

            filter_query["vehicle_id"] = (
                vehicle["_id"]
            )

        if service_visit_id is not None:

            service_visit = (
                await self._get_owned_service_visit(
                    service_visit_id,
                    user_id,
                )
            )

            filter_query["service_visit_id"] = (
                service_visit["_id"]
            )

        receipts = (
            await self.repository.find_many(
                filter_query
            )
        )

        receipts.sort(
            key=lambda receipt: receipt[
                "created_at"
            ],
            reverse=True,
        )

        return [
            ReceiptResponse.model_validate(
                serialize_document(receipt)
            )
            for receipt in receipts
        ]

    # ============================================================
    # GET RECEIPT
    # ============================================================

    async def get_receipt(
        self,
        receipt_id: str,
        user_id: str,
    ) -> ReceiptResponse:

        receipt = await self._get_owned_receipt(
            receipt_id,
            user_id,
        )

        return ReceiptResponse.model_validate(
            serialize_document(receipt)
        )

    # ============================================================
    # UPDATE RECEIPT
    # ============================================================

    async def update_receipt(
        self,
        receipt_id: str,
        user_id: str,
        receipt_update: ReceiptUpdate,
    ) -> ReceiptResponse:

        existing = await self._get_owned_receipt(
            receipt_id,
            user_id,
        )

        update_data = (
            receipt_update.model_dump(
                exclude_unset=True
            )
        )

        # --------------------------------------------------------
        # Handle service visit relationship
        # --------------------------------------------------------

        if "service_visit_id" in update_data:

            service_visit_id = (
                update_data[
                    "service_visit_id"
                ]
            )

            if service_visit_id is None:

                update_data[
                    "service_visit_id"
                ] = None

            else:

                service_visit = (
                    await self._get_owned_service_visit(
                        service_visit_id,
                        user_id,
                    )
                )

                if (
                    str(
                        service_visit[
                            "vehicle_id"
                        ]
                    )
                    != str(
                        existing["vehicle_id"]
                    )
                ):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            "Service visit does not "
                            "belong to the receipt's "
                            "vehicle."
                        ),
                    )

                update_data[
                    "service_visit_id"
                ] = service_visit["_id"]

        update_data["updated_at"] = (
            datetime.now(timezone.utc)
        )

        updated = await self.repository.update(
            {
                "_id": existing["_id"],
            },
            update_data,
        )

        return ReceiptResponse.model_validate(
            serialize_document(updated)
        )

    # ============================================================
    # DELETE RECEIPT
    # ============================================================

    async def delete_receipt(
        self,
        receipt_id: str,
        user_id: str,
    ) -> dict:

        receipt = await self._get_owned_receipt(
            receipt_id,
            user_id,
        )

        deleted = await self.repository.delete(
            {
                "_id": receipt["_id"],
            }
        )

        if deleted:

            await self.storage_service.delete_file(
                receipt["stored_filename"]
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

        vehicle = (
            await self.vehicle_repository.find_one(
                {
                    "_id": to_object_id(
                        vehicle_id
                    ),
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

        if str(vehicle["user_id"]) != user_id:
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
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

        service_visit = (
            await self.maintenance_repository.find_one(
                {
                    "_id": to_object_id(
                        service_visit_id
                    ),
                }
            )
        )

        if service_visit is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail="Service visit not found.",
            )

        if (
            str(service_visit["user_id"])
            != user_id
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail="Access denied.",
            )

        return service_visit

    # ============================================================
    # PRIVATE: GET OWNED RECEIPT
    # ============================================================

    async def _get_owned_receipt(
        self,
        receipt_id: str,
        user_id: str,
    ) -> dict[str, Any]:

        receipt = await self.repository.find_one(
            {
                "_id": to_object_id(
                    receipt_id
                ),
            }
        )

        if receipt is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail="Receipt not found.",
            )

        if str(receipt["user_id"]) != user_id:
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail="Access denied.",
            )

        return receipt