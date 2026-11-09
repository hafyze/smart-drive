import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.repositories.ai_conversation_repository import AIConversationRepository


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("Repository coroutine unexpectedly waited for I/O")


class FakeCollection:
    def __init__(self):
        self.find_one = AsyncMock(return_value=None)
        self.find_one_and_update = AsyncMock(return_value=None)
        self.insert_one = AsyncMock(return_value=SimpleNamespace(inserted_id=ObjectId()))
        self.update_one = AsyncMock()
        self.update_many = AsyncMock()
        self.delete_many = AsyncMock()
        self.delete_one = AsyncMock(return_value=SimpleNamespace(deleted_count=1))


class FakeDatabase:
    def __init__(self, collections):
        self.collections = collections

    def __getitem__(self, name):
        return self.collections[name]


class AIConversationRepositoryTests(unittest.TestCase):
    def setUp(self):
        self.collections = {
            name: FakeCollection()
            for name in [
                "ai_conversations", "ai_conversation_turns",
                "ai_conversation_usage", "ai_conversation_cooldowns",
            ]
        }
        database = FakeDatabase(self.collections)
        with patch("app.repositories.ai_conversation_repository.get_database", return_value=database):
            self.repository = AIConversationRepository()

    def test_reserves_idempotent_turn_under_owned_conversation_and_caps_count(self):
        now = datetime.now(timezone.utc)
        conversation = {
            "_id": ObjectId(), "user_id": "owner-1", "vehicle_id": "vehicle-1",
            "turn_count": 1,
        }
        self.collections["ai_conversations"].find_one_and_update.return_value = conversation
        turn, is_new = run_immediate_coroutine(self.repository.reserve_turn(
            conversation, "client-uuid", "Question", ObjectId(), now, now + timedelta(days=90),
        ))
        self.assertTrue(is_new)
        self.assertEqual(turn["status"], "processing")
        self.assertEqual(turn["user_id"], "owner-1")
        self.assertEqual(turn["vehicle_id"], "vehicle-1")
        filter_query = self.collections["ai_conversations"].find_one_and_update.await_args.args[0]
        self.assertEqual(filter_query["turn_count"], {"$lt": 100})
        self.assertEqual(filter_query["user_id"], "owner-1")
        self.collections["ai_conversation_turns"].insert_one.assert_awaited_once()

    def test_turn_retries_return_existing_idempotency_record_without_reserving_again(self):
        existing = {"_id": ObjectId(), "question": "same", "status": "complete"}
        self.collections["ai_conversation_turns"].find_one.return_value = existing
        now = datetime.now(timezone.utc)
        turn, is_new = run_immediate_coroutine(self.repository.reserve_turn(
            {"_id": ObjectId(), "user_id": "owner", "vehicle_id": "vehicle"},
            "same-request", "same", ObjectId(), now, now + timedelta(days=90),
        ))
        self.assertIs(turn, existing)
        self.assertFalse(is_new)
        self.collections["ai_conversations"].find_one_and_update.assert_not_awaited()

    def test_conversation_deletion_removes_only_turns_for_owner_and_vehicle(self):
        conversation_id = ObjectId()
        deleted = run_immediate_coroutine(self.repository.delete_conversation(
            conversation_id, "owner-1", "vehicle-1",
        ))
        self.assertTrue(deleted)
        self.assertEqual(
            self.collections["ai_conversation_turns"].delete_many.await_args.args[0],
            {"conversation_id": conversation_id, "user_id": "owner-1", "vehicle_id": "vehicle-1"},
        )
        self.assertEqual(
            self.collections["ai_conversations"].delete_one.await_args.args[0],
            {"_id": conversation_id, "user_id": "owner-1", "vehicle_id": "vehicle-1"},
        )

    def test_daily_quota_first_use_stores_a_hashed_key_and_count(self):
        now = datetime.now(timezone.utc)
        result = run_immediate_coroutine(self.repository.acquire_daily_slot("private-user-id", "2026-11-09", now, 20))
        self.assertTrue(result)
        document = self.collections["ai_conversation_usage"].insert_one.await_args.args[0]
        self.assertNotIn("private-user-id", document["_id"])
        self.assertEqual(document["count"], 1)
        self.assertEqual(document["expires_at"], now + timedelta(days=2))

    def test_cooldown_reports_active_expiry_and_uses_hashed_owner_vehicle_key(self):
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(seconds=5)
        self.collections["ai_conversation_cooldowns"].insert_one.side_effect = DuplicateKeyError("duplicate cooldown")
        self.collections["ai_conversation_cooldowns"].find_one.return_value = {"expires_at": expiry}
        result = run_immediate_coroutine(self.repository.acquire_vehicle_cooldown("owner-1", "vehicle-1", now, 10))
        self.assertEqual(result, expiry)
        active_key = self.collections["ai_conversation_cooldowns"].find_one.await_args.args[0]["_id"]
        self.assertNotIn("owner-1", active_key)
        self.assertNotIn("vehicle-1", active_key)


if __name__ == "__main__":
    unittest.main()
