from fastapi import APIRouter, Depends, Query, status

from app.routes.auth import get_current_user
from app.schemas.maintenance import (
    ServiceVisitCreate,
    ServiceVisitResponse,
)
from app.services.maintenance_service import MaintenanceService
from app.dependencies.services_dependencies import get_maintenance_service

router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance"],
)


# ============================================================
# CREATE SERVICE VISIT
# ============================================================

@router.post(
    "",
    response_model=ServiceVisitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_service_visit(
    service_visit: ServiceVisitCreate,
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.create_service_visit(
        user_id=current_user["id"],
        service_visit=service_visit,
    )


# ============================================================
# GET ALL SERVICE VISITS
# ============================================================

@router.get(
    "",
    response_model=list[ServiceVisitResponse],
)
async def get_all_service_visits(
    vehicle_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.get_all_service_visits(
        user_id=current_user["id"],
        vehicle_id=vehicle_id,
    )


# ============================================================
# GET ONE SERVICE VISIT
# ============================================================

@router.get(
    "/{service_visit_id}",
    response_model=ServiceVisitResponse,
)
async def get_service_visit(
    service_visit_id: str,
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.get_service_visit(
        service_visit_id=service_visit_id,
        user_id=current_user["id"],
    )


# ============================================================
# UPDATE SERVICE VISIT
# ============================================================

@router.put(
    "/{service_visit_id}",
    response_model=ServiceVisitResponse,
)
async def update_service_visit(
    service_visit_id: str,
    service_visit: ServiceVisitCreate,
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.update_service_visit(
        service_visit_id=service_visit_id,
        user_id=current_user["id"],
        service_visit=service_visit,
    )


# ============================================================
# DELETE SERVICE VISIT
# ============================================================

@router.delete(
    "/{service_visit_id}",
)
async def delete_service_visit(
    service_visit_id: str,
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.delete_service_visit(
        service_visit_id=service_visit_id,
        user_id=current_user["id"],
    )