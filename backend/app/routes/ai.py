from fastapi import APIRouter, Depends

from app.ai.context_builder import (
    VehicleContextBuilder,
)
from app.ai.schemas import (
    VehicleMaintenanceContext,
)
from app.routes.auth import (
    get_current_user,
)


router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


@router.get(
    "/context/{vehicle_id}",
    response_model=VehicleMaintenanceContext,
)
async def get_vehicle_ai_context(
    vehicle_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
):
    builder = VehicleContextBuilder()

    return await builder.build(
        vehicle_id=vehicle_id,
        user_id=current_user["id"],
    )