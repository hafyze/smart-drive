from fastapi import APIRouter, Depends, Query, status

from app.routes.auth import get_current_user
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceResponse,
    MaintenanceListItem,
    MaintenanceUpdate
)
from app.services.maintenance_service import MaintenanceService
from app.dependencies.services_dependencies import get_maintenance_service

router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance"],
)

#Create
@router.post(
    "",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_maintenance(
    maintenance: MaintenanceCreate,
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.create_maintenance(
        user_id=current_user["id"],
        maintenance=maintenance,
    )

# Get All
@router.get(
    "",
    response_model=list[MaintenanceListItem],
)
async def get_all_maintenance(
    vehicle_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.get_all_maintenance(
        user_id=current_user["id"],
        vehicle_id=vehicle_id,
    )

# Get one
@router.get(
    "/{maintenance_id}",
    response_model=MaintenanceResponse,
)
async def get_maintenance(
    maintenance_id: str,
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.get_maintenance(
        maintenance_id=maintenance_id,
        user_id=current_user["id"],
    )

#Update 
@router.put(
    "/{maintenance_id}",
    response_model=MaintenanceResponse,
)
async def update_maintenance(
    maintenance_id: str,
    maintenance: MaintenanceUpdate,
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.update_maintenance(
        maintenance_id=maintenance_id,
        user_id=current_user["id"],
        update=maintenance,
    )

# Delete
@router.delete(
    "/{maintenance_id}",
)
async def delete_maintenance(
    maintenance_id: str,
    current_user: dict = Depends(get_current_user),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return await service.delete_maintenace(
        maintenace_id=maintenance_id,
        user_id=current_user["id"],
    )
