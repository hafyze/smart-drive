from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import Response

from app.dependencies.services_dependencies import (
    get_receipt_service,
)
from app.routes.auth import get_current_user
from app.schemas.receipt import (
    ReceiptResponse,
    ReceiptUpdate,
)
from app.services.receipt_service import (
    ReceiptService,
)
from app.services.receipt_scan_service import ReceiptScanService
from app.schemas.receipt_scan import ReceiptScanResponse


router = APIRouter(
    prefix="/receipts",
    tags=["Receipts"],
)


@router.post("/scan", response_model=ReceiptScanResponse)
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    del current_user  # Authentication is required before local OCR processing.
    return await ReceiptScanService().scan(file)


# ============================================================
# CREATE RECEIPT
# ============================================================

@router.post(
    "",
    response_model=ReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_receipt(
    vehicle_id: str = Form(...),
    file: UploadFile = File(...),
    service_visit_id: str | None = Form(
        default=None
    ),
    notes: str | None = Form(
        default=None
    ),
    current_user: dict = Depends(
        get_current_user
    ),
    service: ReceiptService = Depends(
        get_receipt_service
    ),
):
    return await service.create_receipt(
        user_id=current_user["id"],
        vehicle_id=vehicle_id,
        service_visit_id=service_visit_id,
        notes=notes,
        file=file,
    )


# ============================================================
# GET ALL RECEIPTS
# ============================================================

@router.get(
    "",
    response_model=list[ReceiptResponse],
)
async def get_all_receipts(
    vehicle_id: str | None = Query(
        default=None
    ),
    service_visit_id: str | None = Query(
        default=None
    ),
    current_user: dict = Depends(
        get_current_user
    ),
    service: ReceiptService = Depends(
        get_receipt_service
    ),
):
    return await service.get_all_receipts(
        user_id=current_user["id"],
        vehicle_id=vehicle_id,
        service_visit_id=service_visit_id,
    )


# ============================================================
# GET RECEIPT
# ============================================================

@router.get(
    "/{receipt_id}/file",
    response_class=Response,
)
async def get_receipt_file(
    receipt_id: str,
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
):
    content, content_type, _filename = await service.get_receipt_file(
        receipt_id=receipt_id,
        user_id=current_user["id"],
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get(
    "/{receipt_id}",
    response_model=ReceiptResponse,
)
async def get_receipt(
    receipt_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
    service: ReceiptService = Depends(
        get_receipt_service
    ),
):
    return await service.get_receipt(
        receipt_id=receipt_id,
        user_id=current_user["id"],
    )


# ============================================================
# UPDATE RECEIPT
# ============================================================

@router.put(
    "/{receipt_id}",
    response_model=ReceiptResponse,
)
async def update_receipt(
    receipt_id: str,
    receipt_update: ReceiptUpdate,
    current_user: dict = Depends(
        get_current_user
    ),
    service: ReceiptService = Depends(
        get_receipt_service
    ),
):
    return await service.update_receipt(
        receipt_id=receipt_id,
        user_id=current_user["id"],
        receipt_update=receipt_update,
    )


# ============================================================
# DELETE RECEIPT
# ============================================================

@router.delete(
    "/{receipt_id}",
)
async def delete_receipt(
    receipt_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
    service: ReceiptService = Depends(
        get_receipt_service
    ),
):
    return await service.delete_receipt(
        receipt_id=receipt_id,
        user_id=current_user["id"],
    )
