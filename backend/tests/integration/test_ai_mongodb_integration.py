"""Opt-in integration tests; require a disposable loopback Mongo database.

Run from backend with SMARTDRIVE_MONGO_TEST_URI and
SMARTDRIVE_MONGO_TEST_DATABASE explicitly set. This suite rejects remote hosts
and database names without the smartdrive_test_ prefix.
"""

import hashlib
import os
import unittest
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit
from uuid import uuid4

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from app.ai.context_builder import VehicleContextBuilder
from app.ai.maintenance_knowledge_service import MaintenanceKnowledgeService
from app.ai.schemas import (
    MaintenanceSummary,
    VehicleIdentity,
    VehicleIdentityConfidence,
)
from app.db import mongodb
from app.repositories.ai_conversation_repository import AIConversationRepository
from app.repositories.maintenance_knowledge_repository import MaintenanceKnowledgeRepository
from app.services.ai_conversation_service import AIConversationService


def test_database_configuration() -> tuple[str, str]:
    uri = os.environ.get("SMARTDRIVE_MONGO_TEST_URI", "").strip()
    database_name = os.environ.get("SMARTDRIVE_MONGO_TEST_DATABASE", "").strip()
    if not uri or not database_name:
        raise unittest.SkipTest(
            "Set SMARTDRIVE_MONGO_TEST_URI and SMARTDRIVE_MONGO_TEST_DATABASE to run real MongoDB tests."
        )
    host = (urlsplit(uri).hostname or "").casefold()
    if host not in {"localhost", "127.0.0.1", "::1"}:
        raise unittest.SkipTest("Integration suite only permits loopback MongoDB hosts.")
    if not database_name.startswith("smartdrive_test_"):
        raise unittest.SkipTest("Integration suite requires a database named smartdrive_test_<suffix>.")
    return uri, database_name


class AIMongoIntegrationTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.mongo_uri, cls.database_name = test_database_configuration()

    async def asyncSetUp(self):
        self.client = AsyncIOMotorClient(
            self.mongo_uri,
            serverSelectionTimeoutMS=3_000,
            connectTimeoutMS=3_000,
            tz_aware=True,
        )
        self.database = self.client[self.database_name]
        try:
            await self.client.admin.command("ping")
        except Exception as exc:
            self.client.close()
            self.fail(f"Configured loopback MongoDB test service is unavailable ({type(exc).__name__}).")

        mongodb.database = self.database
        self.conversations = AIConversationRepository()
        self.cache = MaintenanceKnowledgeRepository()
        self.owner_id = f"integration-owner-{uuid4()}"
        self.other_owner_id = f"integration-owner-{uuid4()}"
        self.vehicle_id = str(ObjectId())
        self.other_vehicle_id = str(ObjectId())
        self.conversation_ids: list[ObjectId] = []
        self.cache_keys: list[str] = []
        self.cooldown_ids: list[str] = []
        self.usage_ids: list[str] = []

        await self.database["ai_conversations"].create_index(
            [("user_id", 1), ("vehicle_id", 1), ("updated_at", -1)],
            name="ai_conversations_by_owner_vehicle",
        )
        await self.database["ai_conversations"].create_index(
            "expires_at", expireAfterSeconds=0, name="ai_conversations_expiry",
        )
        await self.database["ai_conversation_turns"].create_index(
            [("conversation_id", 1), ("client_message_id", 1)],
            unique=True, name="ai_conversation_turn_idempotency",
        )
        await self.database["ai_conversation_turns"].create_index(
            "expires_at", expireAfterSeconds=0, name="ai_conversation_turns_expiry",
        )
        for collection_name, index_name in [
            ("ai_conversation_usage", "ai_conversation_usage_expiry"),
            ("ai_conversation_cooldowns", "ai_conversation_cooldowns_expiry"),
            ("maintenance_knowledge", "maintenance_knowledge_expiry"),
            ("ai_research_cooldowns", "ai_research_cooldown_expiry"),
        ]:
            await self.database[collection_name].create_index(
                "expires_at", expireAfterSeconds=0, name=index_name,
            )

    async def asyncTearDown(self):
        await self.database["ai_conversation_turns"].delete_many({"user_id": self.owner_id})
        await self.database["ai_conversations"].delete_many({"user_id": self.owner_id})
        await self.database["vehicles"].delete_many({"user_id": {"$in": [self.owner_id, self.other_owner_id]}})
        await self.database["maintenance"].delete_many({"user_id": {"$in": [self.owner_id, self.other_owner_id]}})
        if self.cache_keys:
            await self.database["maintenance_knowledge"].delete_many({"cache_key": {"$in": self.cache_keys}})
        for key in self.cooldown_ids:
            await self.database["ai_conversation_cooldowns"].delete_one({"_id": key})
            await self.database["ai_research_cooldowns"].delete_one({"_id": key})
        for key in self.usage_ids:
            await self.database["ai_conversation_usage"].delete_one({"_id": key})
        self.client.close()
        mongodb.database = None

    async def test_conversation_persists_across_repository_instances_and_deletes_turns(self):
        now = datetime.now(timezone.utc)
        conversation = await self.conversations.create_conversation({
            "user_id": self.owner_id,
            "vehicle_id": self.vehicle_id,
            "title": "Integration test",
            "created_at": now,
            "updated_at": now,
            "expires_at": now + timedelta(days=90),
            "turn_count": 0,
        })
        conversation_id = conversation["_id"]
        self.conversation_ids.append(conversation_id)
        client_message_id = str(uuid4())
        turn, is_new = await self.conversations.reserve_turn(
            conversation,
            client_message_id,
            "Which work is in my history?",
            ObjectId(),
            now,
            now + timedelta(days=90),
        )
        self.assertTrue(is_new)
        await self.conversations.complete_turn(turn["_id"], {"recorded_information": []})

        restarted_repository = AIConversationRepository()
        restored = await restarted_repository.get_conversation(
            conversation_id, self.owner_id, self.vehicle_id,
        )
        restored_turns = await restarted_repository.get_turns(conversation_id)
        self.assertEqual(restored["title"], "Integration test")
        self.assertEqual(restored_turns[0]["client_message_id"], client_message_id)
        self.assertEqual(restored_turns[0]["status"], "complete")

        self.assertIsNone(await restarted_repository.get_conversation(
            conversation_id, self.other_owner_id, self.vehicle_id,
        ))
        self.assertIsNone(await restarted_repository.get_conversation(
            conversation_id, self.owner_id, self.other_vehicle_id,
        ))
        self.assertTrue(await restarted_repository.delete_conversation(
            conversation_id, self.owner_id, self.vehicle_id,
        ))
        self.assertEqual(await restarted_repository.get_turns(conversation_id), [])

    async def test_database_context_builder_enforces_vehicle_ownership_and_separates_histories(self):
        owner_vehicle = ObjectId(self.vehicle_id)
        other_vehicle = ObjectId(self.other_vehicle_id)
        await self.database["vehicles"].insert_many([
            {
                "_id": owner_vehicle,
                "user_id": self.owner_id,
                "manufacturer": "Perodua",
                "model": "Myvi",
                "variant": "1.5 AV",
                "year": 2023,
                "current_mileage": 60_000,
                "fuel_type": "PETROL",
                "transmission": "CVT",
                "engine": "1.5L test engine",
                "deleted_at": None,
            },
            {
                "_id": other_vehicle,
                "user_id": self.other_owner_id,
                "manufacturer": "Toyota",
                "model": "Vios",
                "variant": "1.5 G",
                "year": 2021,
                "current_mileage": 30_000,
                "fuel_type": "PETROL",
                "transmission": "CVT",
                "engine": "1.5L other test engine",
                "deleted_at": None,
            },
        ])
        await self.database["maintenance"].insert_many([
            {
                "vehicle_id": owner_vehicle,
                "user_id": self.owner_id,
                "service_date": datetime(2026, 1, 1),
                "mileage_at_service": 59_000,
                "items": [{"type": "ENGINE_OIL", "description": "Owner vehicle test record", "cost": 100}],
                "notes": "Private note must not enter assistant maintenance item context",
            },
            {
                "vehicle_id": other_vehicle,
                "user_id": self.other_owner_id,
                "service_date": datetime(2026, 2, 1),
                "mileage_at_service": 29_000,
                "items": [{"type": "BRAKES", "description": "Other vehicle test record", "cost": 200}],
            },
        ])
        builder = VehicleContextBuilder()
        owner_context = await builder.build_conversation_context(self.vehicle_id, self.owner_id)
        self.assertEqual(owner_context.vehicle.model, "Myvi")
        self.assertEqual([record.description for record in owner_context.maintenance_records], ["Owner vehicle test record"])
        self.assertNotIn("cost", owner_context.maintenance_records[0].model_dump())
        with self.assertRaises(HTTPException) as access_error:
            await builder.build_conversation_context(self.other_vehicle_id, self.owner_id)
        self.assertEqual(access_error.exception.status_code, 403)
        other_context = await builder.build_conversation_context(self.other_vehicle_id, self.other_owner_id)
        self.assertEqual(other_context.vehicle.model, "Vios")
        self.assertEqual([record.description for record in other_context.maintenance_records], ["Other vehicle test record"])

    async def test_cache_is_persistent_scoped_and_invalidated_by_schema_or_expiry(self):
        identity = VehicleIdentity(
            manufacturer="Perodua", model="Myvi", variant="1.5 AV",
            year=2023, transmission="CVT", confidence=VehicleIdentityConfidence.HIGH,
        )
        summary = MaintenanceSummary()
        key = MaintenanceKnowledgeService._cache_key(
            self.owner_id, self.vehicle_id, identity, summary, 60_000,
        )
        other_user_key = MaintenanceKnowledgeService._cache_key(
            self.other_owner_id, self.vehicle_id, identity, summary, 60_000,
        )
        other_vehicle_key = MaintenanceKnowledgeService._cache_key(
            self.owner_id, self.other_vehicle_id, identity, summary, 60_000,
        )
        self.assertNotEqual(key, other_user_key)
        self.assertNotEqual(key, other_vehicle_key)
        self.cache_keys.extend([key, other_user_key, other_vehicle_key])
        now = datetime.now(timezone.utc)
        profile = {"marker": str(uuid4())}
        await self.cache.save_profile(key, profile, now + timedelta(days=1), 3)

        restarted_repository = MaintenanceKnowledgeRepository()
        self.assertEqual((await restarted_repository.get_valid_profile(key, now, 3))["profile"], profile)
        self.assertIsNone(await restarted_repository.get_valid_profile(key, now, 4))
        self.assertIsNone(await restarted_repository.get_valid_profile(key, now + timedelta(days=2), 3))
        self.assertIsNone(await restarted_repository.get_valid_profile(other_user_key, now, 3))
        self.assertIsNone(await restarted_repository.get_valid_profile(other_vehicle_key, now, 3))

    async def test_cooldown_daily_quota_retention_refresh_and_ttl_indexes(self):
        now = datetime.now(timezone.utc)
        cooldown = await self.conversations.acquire_vehicle_cooldown(
            self.owner_id, self.vehicle_id, now, 10,
        )
        self.assertIsNone(cooldown)
        cooldown_key = hashlib.sha256(f"{self.owner_id}:{self.vehicle_id}".encode()).hexdigest()
        self.cooldown_ids.append(cooldown_key)
        restarted_repository = AIConversationRepository()
        blocked_until = await restarted_repository.acquire_vehicle_cooldown(
            self.owner_id, self.vehicle_id, now + timedelta(seconds=1), 10,
        )
        self.assertGreater(blocked_until, now)
        self.assertIsNone(await self.conversations.acquire_vehicle_cooldown(
            self.other_owner_id, self.vehicle_id, now, 10,
        ))
        other_cooldown_key = hashlib.sha256(f"{self.other_owner_id}:{self.vehicle_id}".encode()).hexdigest()
        self.cooldown_ids.append(other_cooldown_key)

        day = f"qa-{uuid4()}"
        usage_key = hashlib.sha256(f"{self.owner_id}:{day}".encode()).hexdigest()
        self.usage_ids.append(usage_key)
        self.assertTrue(await self.conversations.acquire_daily_slot(self.owner_id, day, now, 1))
        restarted_repository = AIConversationRepository()
        self.assertFalse(await restarted_repository.acquire_daily_slot(self.owner_id, day, now, 1))
        self.assertTrue(await restarted_repository.acquire_daily_slot(self.other_owner_id, day, now, 1))
        self.usage_ids.append(hashlib.sha256(f"{self.other_owner_id}:{day}".encode()).hexdigest())

        expired = await self.conversations.create_conversation({
            "user_id": self.owner_id,
            "vehicle_id": self.vehicle_id,
            "title": "Expired QA conversation",
            "created_at": now - timedelta(days=91),
            "updated_at": now - timedelta(days=91),
            "expires_at": now - timedelta(days=1),
            "turn_count": 0,
        })
        self.conversation_ids.append(expired["_id"])

        active = await self.conversations.create_conversation({
            "user_id": self.owner_id,
            "vehicle_id": self.vehicle_id,
            "title": "Active QA conversation",
            "created_at": now,
            "updated_at": now,
            "expires_at": now + timedelta(days=1),
            "turn_count": 0,
        })
        self.conversation_ids.append(active["_id"])
        refreshed_expiry = now + timedelta(days=90)
        await self.conversations.refresh_conversation(active, now, refreshed_expiry, "Active QA conversation")
        saved_active = await self.conversations.get_conversation(
            active["_id"], self.owner_id, self.vehicle_id,
        )
        self.assertEqual(saved_active["expires_at"], refreshed_expiry)

        class OwnerContext:
            async def verify_vehicle_access(_self, requested_vehicle_id, _user_id):
                return requested_vehicle_id

        service = AIConversationService(
            repository=self.conversations,
            context_builder=OwnerContext(),
        )
        listed = await service.list_for_vehicle(self.vehicle_id, self.owner_id)
        self.assertEqual([item.id for item in listed], [str(active["_id"])])

        indexes = await self.database["ai_conversations"].index_information()
        self.assertEqual(indexes["ai_conversations_expiry"]["expireAfterSeconds"], 0)
        turn_indexes = await self.database["ai_conversation_turns"].index_information()
        self.assertTrue(turn_indexes["ai_conversation_turn_idempotency"]["unique"])

if __name__ == "__main__":
    unittest.main()
