import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.ai.context_builder import (
    VehicleContextBuilder,
)
from app.ai.schemas import (
    VehicleMaintenanceContext,
)
from app.ai.maintenance_knowledge_service import (
    MaintenanceKnowledgeService,
)
from app.ai.schemas import MaintenanceKnowledgeProfile
from app.dependencies.auth_dependencies import (
    get_current_user,
)

logger = logging.getLogger(__name__)

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

@router.post(
    "/research/{vehicle_id}",
    response_model=MaintenanceKnowledgeProfile,
)
async def research_vehicle(
    vehicle_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
):
    builder = VehicleContextBuilder()

    context = await builder.build(
        vehicle_id=vehicle_id,
        user_id=current_user["id"],
    )

    identity = context.vehicle.identity

    try:
        service = MaintenanceKnowledgeService()
        return await service.get_maintenance_profile(
            identity=identity,
            maintenance_summary=context.maintenance,
            current_mileage=context.vehicle.current_mileage,
        )
    except TimeoutError as exc:
        logger.warning("AI maintenance research timed out for vehicle %s", vehicle_id)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Maintenance research timed out. Please try again.",
        ) from exc
    except (RuntimeError, ValueError) as exc:
        logger.warning("AI maintenance research is unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Maintenance research is not configured or is currently unavailable.",
        ) from exc
    except Exception as exc:
        logger.exception("AI maintenance research failed for vehicle %s", vehicle_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Maintenance research could not be completed. Please try again.",
        ) from exc
