import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.security_core import hash_password, verifiy_password
from app.repositories.session_repository import SessionRepository
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
        self.session_repository = SessionRepository()

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
        token = await self._create_session_token(
            user_id=user["id"],
            remember_me=False,
        )

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
        token = await self._create_session_token(
            user_id=serialized["id"],
            remember_me=request.remember_me,
        )

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

    async def get_current_user_by_token(
        self,
        token: str,
    ):
        session = await self.session_repository.find_active_by_token_hash(
            self._hash_token(token)
        )

        if session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        now = datetime.now(timezone.utc)

        if session.get("remember_me"):
            await self.session_repository.update(
                {
                    "_id": session["_id"],
                },
                {
                    "expires_at": now + timedelta(days=7),
                    "last_seen_at": now,
                    "updated_at": now,
                },
            )
        else:
            await self.session_repository.update(
                {
                    "_id": session["_id"],
                },
                {
                    "last_seen_at": now,
                    "updated_at": now,
                },
            )

        return await self.get_current_user(str(session["user_id"]))

    async def logout(self, token: str) -> dict:
        await self.session_repository.revoke_by_token_hash(
            self._hash_token(token)
        )

        return {
            "success": True,
        }

    async def _create_session_token(
        self,
        user_id: str,
        remember_me: bool,
    ) -> str:
        now = datetime.now(timezone.utc)
        token = secrets.token_urlsafe(48)

        expires_at = now + (
            timedelta(days=7)
            if remember_me
            else timedelta(hours=12)
        )

        await self.session_repository.insert(
            {
                "user_id": user_id,
                "token_hash": self._hash_token(token),
                "remember_me": remember_me,
                "expires_at": expires_at,
                "last_seen_at": now,
                "revoked_at": None,
                "created_at": now,
                "updated_at": now,
            }
        )

        return token

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest()
