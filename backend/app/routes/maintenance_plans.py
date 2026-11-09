from fastapi import APIRouter, Depends, status

from app.dependencies.services_dependencies import get_maintenance_plan_service
from app.routes.auth import get_current_user
from app.schemas.maintenance_plan import (
    ApprovePlanRequest,
    CompleteActionRequest,
    CreateUserActionRequest,
    GeneratePlanRequest,
    MaintenancePlan,
    MaintenancePlanAction,
    ReminderUpdateRequest,
    RescheduleActionRequest,
    ReviewActionRequest,
    SkipActionRequest,
    UpdateActionRequest,
)
from app.services.maintenance_plan_service import MaintenancePlanService


router = APIRouter(prefix="/maintenance-plans", tags=["Maintenance Plans"])


@router.get("/vehicles/{vehicle_id}", response_model=list[MaintenancePlan])
async def list_vehicle_plans(vehicle_id: str, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.list_vehicle_plans(vehicle_id, current_user["id"])


@router.get("/vehicles/{vehicle_id}/timeline", response_model=list[MaintenancePlanAction])
async def get_vehicle_timeline(vehicle_id: str, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.vehicle_timeline(vehicle_id, current_user["id"])


@router.post("/vehicles/{vehicle_id}/generate", response_model=MaintenancePlan, status_code=status.HTTP_201_CREATED)
async def generate_vehicle_plan(vehicle_id: str, request: GeneratePlanRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.generate_plan(vehicle_id, current_user["id"], request)


@router.get("/{plan_id}", response_model=MaintenancePlan)
async def get_plan(plan_id: str, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.get_plan(plan_id, current_user["id"])


@router.post("/{plan_id}/approve", response_model=MaintenancePlan)
async def approve_plan(plan_id: str, request: ApprovePlanRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.approve_plan(plan_id, current_user["id"], request)


@router.post("/{plan_id}/archive", response_model=MaintenancePlan)
async def archive_plan(plan_id: str, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.archive_plan(plan_id, current_user["id"])


@router.post("/{plan_id}/actions", response_model=MaintenancePlan, status_code=status.HTTP_201_CREATED)
async def create_user_action(plan_id: str, request: CreateUserActionRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.create_user_action(plan_id, current_user["id"], request)


@router.patch("/{plan_id}/actions/{action_id}", response_model=MaintenancePlan)
async def update_action(plan_id: str, action_id: str, request: UpdateActionRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.update_action(plan_id, action_id, current_user["id"], request)


@router.post("/{plan_id}/actions/{action_id}/review", response_model=MaintenancePlan)
async def review_action(plan_id: str, action_id: str, request: ReviewActionRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.review_action(plan_id, action_id, current_user["id"], request)


@router.post("/{plan_id}/actions/{action_id}/reschedule", response_model=MaintenancePlan)
async def reschedule_action(plan_id: str, action_id: str, request: RescheduleActionRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.reschedule_action(plan_id, action_id, current_user["id"], request)


@router.post("/{plan_id}/actions/{action_id}/skip", response_model=MaintenancePlan)
async def skip_action(plan_id: str, action_id: str, request: SkipActionRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.skip_action(plan_id, action_id, current_user["id"], request)


@router.post("/{plan_id}/actions/{action_id}/restore", response_model=MaintenancePlan)
async def restore_action(plan_id: str, action_id: str, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.restore_skipped_action(plan_id, action_id, current_user["id"])


@router.post("/{plan_id}/actions/{action_id}/cancel", response_model=MaintenancePlan)
async def cancel_action(plan_id: str, action_id: str, request: SkipActionRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.cancel_action(plan_id, action_id, current_user["id"], request)


@router.post("/{plan_id}/actions/{action_id}/start", response_model=MaintenancePlan)
async def start_action(plan_id: str, action_id: str, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.start_action(plan_id, action_id, current_user["id"])


@router.post("/{plan_id}/actions/{action_id}/complete", response_model=MaintenancePlan)
async def complete_action(plan_id: str, action_id: str, request: CompleteActionRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.complete_action(plan_id, action_id, current_user["id"], request)


@router.post("/{plan_id}/actions/{action_id}/reminder", response_model=MaintenancePlan)
async def update_reminder(plan_id: str, action_id: str, request: ReminderUpdateRequest, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    from app.schemas.maintenance_plan import ReminderSettings
    return await service.update_action(plan_id, action_id, current_user["id"], UpdateActionRequest(reminder=ReminderSettings(**request.model_dump())))


@router.post("/{plan_id}/actions/{action_id}/reminder/dismiss", response_model=MaintenancePlan)
async def dismiss_reminder(plan_id: str, action_id: str, current_user: dict = Depends(get_current_user), service: MaintenancePlanService = Depends(get_maintenance_plan_service)):
    return await service.dismiss_reminder(plan_id, action_id, current_user["id"])
