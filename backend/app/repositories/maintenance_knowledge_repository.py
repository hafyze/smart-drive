from datetime import datetime

from app.repositories.base_repository import BaseRepository


class MaintenanceKnowledgeRepository(BaseRepository):
    def __init__(self):
        super().__init__("maintenance_knowledge")

    async def get_valid_profile(
        self,
        cache_key: str,
        now: datetime,
        schema_version: int,
    ) -> dict | None:
        return await self.collection.find_one(
            {
                "cache_key": cache_key,
                "schema_version": schema_version,
                "expires_at": {"$gt": now},
            }
        )

    async def save_profile(
        self,
        cache_key: str,
        profile: dict,
        expires_at: datetime,
        schema_version: int,
    ) -> None:
        await self.collection.update_one(
            {"cache_key": cache_key},
            {
                "$set": {
                    "profile": profile,
                    "expires_at": expires_at,
                    "schema_version": schema_version,
                }
            },
            upsert=True,
        )
