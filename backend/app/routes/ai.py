from fastapi import APIRouter, Depends

from app.ai.context_builder import (
    VehicleContextBuilder,
)
from app.ai.schemas import (
    VehicleMaintenanceContext,
)
from app.ai.research.factory import (
    get_research_provider,
)
from app.ai.search.factory import (
    get_maintenance_search_provider,
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

@router.get("/research/{vehicle_id}")
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

    search_provider = (
        get_maintenance_search_provider()
    )

    research_provider = (
        get_research_provider()
    )

    search_results = await search_provider.search(
        identity
    )

    research = await research_provider.research(
        identity=identity,
        search_results=search_results,
    )

    return {
        "identity": identity,
        "search_results": search_results,
        "research": research,
    }