from fastapi import APIRouter, Depends, status

from app.routes.deps import get_current_user_id
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleListItem,
    VehicleResponse,
    VehicleUpdate,
)
from app.services.vehicle_service import VehicleService
from app.dependencies.services import get_vehicle_service

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
)

# Create Vehicle
@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_vehicle(
    vehicle: VehicleCreate, 
    user_id: str = Depends(get_current_user_id), 
    service: VehicleService = Depends(get_vehicle_service)
    ):

    return await service.create_vehicle(
        user_id=user_id, vehicle=vehicle
    )

# Get Vehicle
@router.get(
    "/{vehicle_id}",
    response_model=VehicleResponse,
)
async def get_vehicle(
    vehicle_id: str, 
    user_id: str = Depends(get_current_user_id),
    service: VehicleService = Depends(get_vehicle_service)
    ):

    return await service.get_vehicle(
        vehicle_id=vehicle_id,
        user_id=user_id
    )

# Update Vehicle
@router.put(
    "/{vehicle_id}",
    response_model=VehicleResponse,
)
async def update_vehicle(
    vehicle_id: str, 
    vehicle: VehicleUpdate, 
    user_id: str = Depends(get_current_user_id),
    service: VehicleService = Depends(get_vehicle_service),
    ):

    return await service.update_vehicle(
        vehicle_id=vehicle_id,
        user_id=user_id,
        update=vehicle,
    )

# Delete Vehicle
@router.delete(
    "/{vehicle_id}",
)
async def delete_vehicle(
    vehicle_id: str, 
    user_id: str = Depends(get_current_user_id),
    service: VehicleService = Depends(get_vehicle_service)
    ):

    return await service.delete_vehicle(
        vehicle_id=vehicle_id,
        user_id=user_id
    )