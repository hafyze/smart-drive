import hashlib
from datetime import datetime, timedelta

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.db.mongodb import get_database


class AIConversationRepository:
    MAX_TURNS = 100

    def __init__(self):
        database = get_database()
        self.conversations = database["ai_conversations"]
        self.turns = database["ai_conversation_turns"]
        self.usage = database["ai_conversation_usage"]
        self.cooldowns = database["ai_conversation_cooldowns"]

    async def create_conversation(self, document: dict) -> dict:
        result = await self.conversations.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    async def list_conversations(self, user_id: str, vehicle_id: str) -> list[dict]:
        return await self.conversations.find(
            {"user_id": user_id, "vehicle_id": vehicle_id}
        ).sort("updated_at", -1).to_list(length=None)

    async def get_conversation(self, conversation_id, user_id: str, vehicle_id: str):
        return await self.conversations.find_one({
            "_id": conversation_id,
            "user_id": user_id,
            "vehicle_id": vehicle_id,
        })

    async def get_turns(self, conversation_id) -> list[dict]:
        return await self.turns.find({"conversation_id": conversation_id}).sort(
            "created_at", 1
        ).to_list(length=100)

    async def get_recent_turns(self, conversation_id, limit: int) -> list[dict]:
        turns = await self.turns.find({
            "conversation_id": conversation_id,
            "status": "complete",
        }).sort("created_at", -1).to_list(length=limit)
        return list(reversed(turns))

    async def reserve_turn(
        self,
        conversation: dict,
        client_message_id: str,
        question: str,
        turn_id,
        now: datetime,
        expires_at: datetime,
    ) -> tuple[dict | None, bool]:
        existing = await self.turns.find_one({
            "conversation_id": conversation["_id"],
            "client_message_id": client_message_id,
        })
        if existing is not None:
            return existing, False

        reserved = await self.conversations.find_one_and_update(
            {
                "_id": conversation["_id"],
                "user_id": conversation["user_id"],
                "vehicle_id": conversation["vehicle_id"],
                "turn_count": {"$lt": self.MAX_TURNS},
                "expires_at": {"$gt": now},
            },
            {"$inc": {"turn_count": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if reserved is None:
            return None, False

        turn = {
            "_id": turn_id,
            "conversation_id": conversation["_id"],
            "user_id": conversation["user_id"],
            "vehicle_id": conversation["vehicle_id"],
            "client_message_id": client_message_id,
            "question": question,
            "answer": None,
            "status": "processing",
            "created_at": now,
            "expires_at": expires_at,
        }
        try:
            await self.turns.insert_one(turn)
            return turn, True
        except DuplicateKeyError:
            await self.conversations.update_one(
                {"_id": conversation["_id"]}, {"$inc": {"turn_count": -1}}
            )
            existing = await self.turns.find_one({
                "conversation_id": conversation["_id"],
                "client_message_id": client_message_id,
            })
            if existing is None:
                raise RuntimeError("Unable to reserve the conversation turn.")
            return existing, False
        except Exception:
            await self.conversations.update_one(
                {"_id": conversation["_id"]}, {"$inc": {"turn_count": -1}}
            )
            raise

    async def retry_failed_turn(self, turn: dict, now: datetime, expires_at: datetime) -> tuple[dict, bool]:
        updated = await self.turns.find_one_and_update(
            {"_id": turn["_id"], "status": "failed"},
            {"$set": {
                "status": "processing",
                "answer": None,
                "created_at": now,
                "expires_at": expires_at,
            }},
            return_document=ReturnDocument.AFTER,
        )
        claimed = updated is not None
        if not claimed:
            updated = await self.turns.find_one({"_id": turn["_id"]})
        if updated is None:
            raise RuntimeError("Unable to retry the conversation turn.")
        return updated, claimed

    async def complete_turn(self, turn_id, answer: dict) -> None:
        await self.turns.update_one(
            {"_id": turn_id, "status": "processing"},
            {"$set": {"answer": answer, "status": "complete"}},
        )

    async def mark_turn_failed(self, turn_id) -> None:
        await self.turns.update_one(
            {"_id": turn_id, "status": "processing"},
            {"$set": {"status": "failed"}},
        )

    async def refresh_conversation(
        self,
        conversation: dict,
        now: datetime,
        expires_at: datetime,
        title: str | None = None,
    ) -> None:
        update = {"updated_at": now, "expires_at": expires_at}
        if title and conversation.get("title") == "New conversation":
            update["title"] = title[:80]
        await self.conversations.update_one(
            {"_id": conversation["_id"]}, {"$set": update}
        )
        await self.turns.update_many(
            {"conversation_id": conversation["_id"]},
            {"$set": {"expires_at": expires_at}},
        )

    async def delete_conversation(self, conversation_id, user_id: str, vehicle_id: str) -> bool:
        await self.turns.delete_many({
            "conversation_id": conversation_id,
            "user_id": user_id,
            "vehicle_id": vehicle_id,
        })
        result = await self.conversations.delete_one({
            "_id": conversation_id,
            "user_id": user_id,
            "vehicle_id": vehicle_id,
        })
        return result.deleted_count == 1

    async def acquire_daily_slot(self, user_id: str, day: str, now: datetime, max_count: int) -> bool:
        key = hashlib.sha256(f"{user_id}:{day}".encode()).hexdigest()
        document = await self.usage.find_one_and_update(
            {"_id": key, "count": {"$lt": max_count}},
            {"$inc": {"count": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if document is not None:
            return True
        try:
            await self.usage.insert_one({
                "_id": key,
                "count": 1,
                "expires_at": now + timedelta(days=2),
            })
            return True
        except DuplicateKeyError:
            document = await self.usage.find_one_and_update(
                {"_id": key, "count": {"$lt": max_count}},
                {"$inc": {"count": 1}},
                return_document=ReturnDocument.AFTER,
            )
            return document is not None

    async def release_daily_slot(self, user_id: str, day: str) -> None:
        key = hashlib.sha256(f"{user_id}:{day}".encode()).hexdigest()
        await self.usage.update_one({"_id": key, "count": {"$gt": 0}}, {"$inc": {"count": -1}})

    async def acquire_vehicle_cooldown(self, user_id: str, vehicle_id: str, now: datetime, seconds: int) -> datetime | None:
        key = hashlib.sha256(f"{user_id}:{vehicle_id}".encode()).hexdigest()
        expires_at = now + timedelta(seconds=seconds)
        active = await self.cooldowns.find_one_and_update(
            {"_id": key, "expires_at": {"$lte": now}},
            {"$set": {"expires_at": expires_at}},
            return_document=ReturnDocument.AFTER,
        )
        if active is not None:
            return None
        try:
            await self.cooldowns.insert_one({"_id": key, "expires_at": expires_at})
            return None
        except DuplicateKeyError:
            active = await self.cooldowns.find_one({"_id": key})
            if active is None:
                raise RuntimeError("Unable to establish the assistant cooldown.")
            return active["expires_at"]
