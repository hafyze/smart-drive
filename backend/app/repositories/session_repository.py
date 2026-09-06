from datetime import datetime, timezone

from app.repositories.base_repository import BaseRepository


class SessionRepository(BaseRepository):
    def __init__(self):
        super().__init__("sessions")

    async def find_active_by_token_hash(
        self,
        token_hash: str,
    ):
        return await self.find_one(
            {
                "token_hash": token_hash,
                "revoked_at": None,
                "expires_at": {
                    "$gt": datetime.now(timezone.utc),
                },
            }
        )

    async def revoke_by_token_hash(
        self,
        token_hash: str,
    ) -> bool:
        result = await self.collection.update_one(
            {
                "token_hash": token_hash,
                "revoked_at": None,
            },
            {
                "$set": {
                    "revoked_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )

        return result.modified_count > 0
