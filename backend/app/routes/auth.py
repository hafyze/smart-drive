from fastapi import APIRouter, Depends, status

from app.dependencies.services_dependencies import get_auth_service
from app.dependencies.auth_dependencies import get_current_user
from app.schemas.auth import (
    LoginRequst,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService
from app.schemas.auth import UserResponse

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(request: RegisterRequest, service: AuthService = Depends(get_auth_service)):
    return await service.register(request)

@router.post(
    "login",
    response_model=TokenResponse,
)
async def login(request: LoginRequst, service: AuthService = Depends(get_auth_service)):
    return await service.login(request)

@router.get(
    "/me",
    response_model=UserResponse,
)
async def me(
    current_user=Depends(get_current_user)
):
    return UserResponse.model_validate(current_user)