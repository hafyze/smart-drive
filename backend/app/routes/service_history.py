from fastapi import APIRouter, Depends

from app.routes.auth import get_current_user
from app.schemas.service_history import ServiceHistoryVisit
from app.services.service_history_service import ServiceHistoryService
from app.dependencies.services_dependencies import get_service_history_service


router = APIRouter(
    prefix="/service-history",
    tags=["Service History"],
)


@router.get(
    "/{vehicle_id}",
    response_model=list[ServiceHistoryVisit],
)
async def get_vehicle_service_history(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
    service: ServiceHistoryService = Depends(
        get_service_history_service
    ),
):
    return await service.get_vehicle_service_history(
        vehicle_id=vehicle_id,
        user_id=current_user["id"],
    )