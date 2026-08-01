from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongodb import connect_mongodb, disconnect_mongodb
from app.routes.health import router as health_router
from app.routes.vehicles import router as vehicle_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_mongodb()

    yield

    await disconnect_mongodb()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

#CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins= settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Routes
app.include_router(health_router)
app.include_router(vehicle_router)