from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.health import router as health_router

app = FastAPI(
    title="AutoCare API",
    version="1.0.0",
    description="AI vehicle maintenance platform API",
)

#CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins= settings.cors_origin,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Routes
app.include_router(health_router)