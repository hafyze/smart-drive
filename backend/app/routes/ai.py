import logging
from pathlib import Path
import traceback

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.ai.context_builder import (
    VehicleContextBuilder,
)
from app.ai.schemas import (
    VehicleMaintenanceContext,
)
from app.ai.maintenance_knowledge_service import (
    MaintenanceKnowledgeService,
    ResearchCooldownError,
)
from app.ai.schemas import MaintenanceKnowledgeProfile
from app.ai.schemas import (
    ConversationDetail,
    ConversationMessageRequest,
    ConversationSummary,
    ConversationTurn,
)
from app.dependencies.auth_dependencies import (
    get_current_user,
)
from app.services.ai_conversation_service import AIConversationService
from app.ai.predictive_schemas import PredictiveMaintenanceReport, PredictiveMaintenanceRequest
from app.ai.predictive_maintenance_service import PredictiveMaintenanceService, PredictiveResearchCooldownError

logger = logging.getLogger(__name__)


def _safe_error_frames(exc: Exception) -> str:
    """Return source locations without logging exception messages or request data."""
    frames = traceback.extract_tb(exc.__traceback__ or None)[-5:]
    if not frames:
        return "unavailable"
    return " <- ".join(
        f"{Path(frame.filename).name}:{frame.lineno}:{frame.name}"
        for frame in frames
    )

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


@router.get(
    "/predictive-maintenance/{vehicle_id}/cached",
    response_model=PredictiveMaintenanceReport,
    responses={204: {"description": "No current predictive research report is cached."}},
)
async def get_cached_predictive_maintenance(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
):
    context = await VehicleContextBuilder().build_conversation_context(vehicle_id, current_user["id"])
    report = await PredictiveMaintenanceService().get_cached_report(current_user["id"], vehicle_id, context)
    if report is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return report


@router.post(
    "/predictive-maintenance/{vehicle_id}",
    response_model=PredictiveMaintenanceReport,
)
async def research_predictive_maintenance(
    vehicle_id: str,
    request: PredictiveMaintenanceRequest,
    current_user: dict = Depends(get_current_user),
):
    context = await VehicleContextBuilder().build_conversation_context(vehicle_id, current_user["id"])
    try:
        return await PredictiveMaintenanceService().research(
            current_user["id"], vehicle_id, context, refresh=request.refresh,
        )
    except PredictiveResearchCooldownError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Predictive maintenance research was recently requested. Please wait before trying again.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc
    except TimeoutError as exc:
        logger.warning("Predictive maintenance research timed out for vehicle %s", vehicle_id)
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Predictive maintenance research timed out. Please try again.") from exc
    except (RuntimeError, ValueError) as exc:
        logger.warning("Predictive maintenance research is unavailable (%s)", type(exc).__name__)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Predictive maintenance research is unavailable. Please try again later.") from exc
    except Exception as exc:
        logger.warning(
            "Predictive maintenance research failed for vehicle %s (%s; frames=%s)",
            vehicle_id, type(exc).__name__, _safe_error_frames(exc),
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Predictive maintenance research could not be completed. Please try again.") from exc


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
            user_id=current_user["id"],
            vehicle_id=vehicle_id,
            identity=identity,
            maintenance_summary=context.maintenance,
            current_mileage=context.vehicle.current_mileage,
        )
    except ResearchCooldownError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Research was recently requested for this vehicle. Please wait before trying again.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc
    except TimeoutError as exc:
        logger.warning("AI maintenance research timed out for vehicle %s", vehicle_id)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Maintenance research timed out. Please try again.",
        ) from exc
    except (RuntimeError, ValueError) as exc:
        logger.warning("AI maintenance research is unavailable (%s)", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Maintenance research is not configured or is currently unavailable.",
        ) from exc
    except Exception as exc:
        logger.warning(
            "AI maintenance research failed for vehicle %s (%s; frames=%s)",
            vehicle_id,
            type(exc).__name__,
            _safe_error_frames(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Maintenance research could not be completed. Please try again.",
        ) from exc


@router.get(
    "/research/{vehicle_id}/cached",
    response_model=MaintenanceKnowledgeProfile,
    responses={204: {"description": "No valid cached profile exists."}},
)
async def get_cached_vehicle_research(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
):
    context = await VehicleContextBuilder().build(
        vehicle_id=vehicle_id,
        user_id=current_user["id"],
    )
    profile = await MaintenanceKnowledgeService().get_cached_profile(
        user_id=current_user["id"],
        vehicle_id=vehicle_id,
        identity=context.vehicle.identity,
        maintenance_summary=context.maintenance,
        current_mileage=context.vehicle.current_mileage,
    )
    if profile is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return profile


@router.post(
    "/vehicles/{vehicle_id}/conversations",
    response_model=ConversationSummary,
    status_code=status.HTTP_201_CREATED,
)
async def create_vehicle_conversation(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await AIConversationService().create(vehicle_id, current_user["id"])


@router.get(
    "/vehicles/{vehicle_id}/conversations",
    response_model=list[ConversationSummary],
)
async def list_vehicle_conversations(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await AIConversationService().list_for_vehicle(vehicle_id, current_user["id"])


@router.get(
    "/vehicles/{vehicle_id}/conversations/{conversation_id}",
    response_model=ConversationDetail,
)
async def get_vehicle_conversation(
    vehicle_id: str,
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await AIConversationService().get(vehicle_id, conversation_id, current_user["id"])


@router.delete(
    "/vehicles/{vehicle_id}/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_vehicle_conversation(
    vehicle_id: str,
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    await AIConversationService().delete(vehicle_id, conversation_id, current_user["id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/vehicles/{vehicle_id}/conversations/{conversation_id}/messages",
    response_model=ConversationTurn,
)
async def send_vehicle_conversation_message(
    vehicle_id: str,
    conversation_id: str,
    request: ConversationMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        return await AIConversationService().send_message(
            vehicle_id=vehicle_id,
            conversation_id=conversation_id,
            user_id=current_user["id"],
            client_message_id=request.client_message_id,
            question=request.content,
        )
    except HTTPException:
        raise
    except TimeoutError as exc:
        logger.warning("Vehicle assistant request timed out for vehicle %s", vehicle_id)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The assistant took too long to respond. Please try again.",
        ) from exc
    except (RuntimeError, ValueError) as exc:
        logger.warning("Vehicle assistant is unavailable (%s)", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The assistant is currently unavailable. Please try again later.",
        ) from exc
    except Exception as exc:
        logger.warning(
            "Vehicle assistant failed for vehicle %s (%s; frames=%s)",
            vehicle_id, type(exc).__name__, _safe_error_frames(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The assistant could not complete the request. Please try again.",
        ) from exc
