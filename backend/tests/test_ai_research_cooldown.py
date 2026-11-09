import unittest
from datetime import datetime, timedelta, timezone

from pymongo.errors import DuplicateKeyError

from app.repositories.maintenance_knowledge_repository import MaintenanceKnowledgeRepository


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The coroutine unexpectedly waited for I/O")


class FakeCooldownCollection:
    def __init__(self):
        self.documents = {}
        self.database = {"ai_research_cooldowns": self}

    async def find_one_and_update(self, query, update, return_document):
        document = self.documents.get(query["_id"])
        now = query["expires_at"]["$lte"]
        if document and document["expires_at"] <= now:
            document.update(update["$set"])
            return document.copy()
        return None

    async def insert_one(self, document):
        if document["_id"] in self.documents:
            raise DuplicateKeyError("duplicate id")
        self.documents[document["_id"]] = document.copy()

    async def find_one(self, query):
        document = self.documents.get(query["_id"])
        return document.copy() if document else None


class MaintenanceResearchCooldownTests(unittest.TestCase):
    def setUp(self):
        self.repository = MaintenanceKnowledgeRepository.__new__(MaintenanceKnowledgeRepository)
        self.collection = FakeCooldownCollection()
        self.repository.collection = self.collection
        self.now = datetime(2026, 11, 9, tzinfo=timezone.utc)

    def test_acquires_once_per_owner_vehicle_and_reacquires_after_expiry(self):
        first = run_immediate_coroutine(self.repository.acquire_research_cooldown(
            "owner-1", "vehicle-1", self.now, timedelta(seconds=60),
        ))
        active = run_immediate_coroutine(self.repository.acquire_research_cooldown(
            "owner-1", "vehicle-1", self.now + timedelta(seconds=10), timedelta(seconds=60),
        ))
        other_vehicle = run_immediate_coroutine(self.repository.acquire_research_cooldown(
            "owner-1", "vehicle-2", self.now, timedelta(seconds=60),
        ))
        after_expiry = run_immediate_coroutine(self.repository.acquire_research_cooldown(
            "owner-1", "vehicle-1", self.now + timedelta(seconds=61), timedelta(seconds=60),
        ))
        self.assertIsNone(first)
        self.assertEqual(active, self.now + timedelta(seconds=60))
        self.assertIsNone(other_vehicle)
        self.assertIsNone(after_expiry)

    def test_storage_error_propagates_so_provider_access_fails_closed(self):
        async def failed_insert(document):
            raise ConnectionError("database unavailable")
        self.collection.insert_one = failed_insert
        with self.assertRaises(ConnectionError):
            run_immediate_coroutine(self.repository.acquire_research_cooldown(
                "owner-1", "vehicle-1", self.now, timedelta(seconds=60),
            ))


if __name__ == "__main__":
    unittest.main()
