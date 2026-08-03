from bson import ObjectId
from fastapi import HTTPException, status

from app.core.jwt_core import create_access_token
from app.core.security_core import hash_password, verifiy_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    LoginRequst,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.shared.utils.serialization import serialize_document

class AuthService:
    def __init__(self):
        self.repository = UserRepository()

    async def register(self, request: RegisterRequest,) -> TokenResponse:
        existing = await self.repository.find_one(
            {
                "email": request.email.lower()
            }            
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )
        document = {
            "email": request.email.lower(),
            "password_hash": hash_password(
                request.password
            ),
        }

        created = await self.repository.insert(document)
        user = serialize_document(created)
        token = create_access_token(user["id"])

        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user)
        )

    async def login(self, request: LoginRequst,) -> TokenResponse:
        user = await self.repository.find_one(
            {
                "email": request.email.lower()
            }
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid email or password",
            )

        if not verifiy_password(request.password, user["password_hash"],):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid email or password",
            )

        serialized = serialize_document(user)
        token = create_access_token(serialized["id"])

        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(serialized)
        )

    async def get_current_user(self, user_id: str):
        user = await self.repository.get_by_id(user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )

        return serialize_document(user)