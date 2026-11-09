import hashlib
from datetime import datetime, timedelta

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

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

    async def acquire_research_cooldown(
        self,
        user_id: str,
        vehicle_id: str,
        now: datetime,
        duration: timedelta,
    ) -> datetime | None:
        """Return the active cooldown expiry, or None when this request acquired it."""
        cooldown_key = hashlib.sha256(
            f"{user_id}:{vehicle_id}".encode("utf-8")
        ).hexdigest()
        collection = self.collection.database["ai_research_cooldowns"]
        expires_at = now + duration
        updated = await collection.find_one_and_update(
            {"_id": cooldown_key, "expires_at": {"$lte": now}},
            {"$set": {"expires_at": expires_at}},
            return_document=ReturnDocument.AFTER,
        )
        if updated is not None:
            return None

        try:
            await collection.insert_one({"_id": cooldown_key, "expires_at": expires_at})
            return None
        except DuplicateKeyError:
            active = await collection.find_one({"_id": cooldown_key})
            if active is None:
                raise RuntimeError("Unable to establish the AI research cooldown.")
            return active["expires_at"]
