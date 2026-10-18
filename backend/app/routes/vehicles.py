from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import Response

from app.routes.auth import get_current_user
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleListItem,
    VehicleResponse,
    VehicleUpdate,
)
from app.services.vehicle_service import VehicleService
from app.dependencies.services_dependencies import get_vehicle_service

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
    current_user: dict = Depends(get_current_user), 
    service: VehicleService = Depends(get_vehicle_service)
    ):

    return await service.create_vehicle(
        user_id=current_user["id"], vehicle=vehicle
    )

# Get Vehicle
@router.get(
    "/{vehicle_id}",
    response_model=VehicleResponse,
)
async def get_vehicle(
    vehicle_id: str, 
    current_user: dict = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
    ):

    return await service.get_vehicle(
        vehicle_id=vehicle_id,
        user_id=current_user["id"]
    )

# Get All vehicle
@router.get(
    "",
    response_model=list[VehicleListItem],
)
async def get_all_vehicles(
    current_user: dict = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service),
):
    return await service.get_all_vehicles(
        user_id=current_user["id"]
    )

# Update Vehicle
@router.put(
    "/{vehicle_id}",
    response_model=VehicleResponse,
)
async def update_vehicle(
    vehicle_id: str, 
    vehicle: VehicleUpdate, 
    current_user: dict = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service),
    ):

    return await service.update_vehicle(
        vehicle_id=vehicle_id,
        user_id=current_user["id"],
        update=vehicle,
    )

# Delete Vehicle
@router.delete(
    "/{vehicle_id}",
)
async def delete_vehicle(
    vehicle_id: str, 
    current_user: dict = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
    ):

    return await service.delete_vehicle(
        vehicle_id=vehicle_id,
        user_id=current_user["id"]
    )


@router.post("/{vehicle_id}/photo", response_model=VehicleResponse)
async def upload_vehicle_photo(
    vehicle_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service),
):
    return await service.upload_photo(vehicle_id, current_user["id"], file)


@router.delete("/{vehicle_id}/photo", response_model=VehicleResponse)
async def delete_vehicle_photo(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service),
):
    return await service.delete_photo(vehicle_id, current_user["id"])


@router.get("/{vehicle_id}/photo", response_class=Response)
async def get_vehicle_photo(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service),
):
    content, content_type = await service.get_photo(vehicle_id, current_user["id"])
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
