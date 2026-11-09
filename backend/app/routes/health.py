import logging

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.db.mongodb import get_database

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health():
    try:
        await get_database().command("ping")
    except Exception as exc:
        logger.exception("MongoDB health check failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "service": settings.app_name,
                "version": settings.app_version,
                "database": "disconnected",
            },
        ) from exc

    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "database": "connected",
    }
