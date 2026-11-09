from pymongo import ReturnDocument

from app.repositories.base_repository import BaseRepository


class MaintenancePlanRepository(BaseRepository):
    def __init__(self):
        super().__init__("maintenance_plans")

    async def list_for_vehicle(self, user_id: str, vehicle_id):
        return await self.collection.find(
            {"user_id": user_id, "vehicle_id": vehicle_id}
        ).sort("updated_at", -1).to_list(length=100)

    async def find_owned_plan(self, plan_id, user_id: str):
        return await self.collection.find_one({"_id": plan_id, "user_id": user_id})

    async def find_plan_for_vehicle(self, user_id: str, vehicle_id, status: str):
        return await self.collection.find_one(
            {"user_id": user_id, "vehicle_id": vehicle_id, "status": status},
            sort=[("updated_at", -1)],
        )

    async def insert_plan(self, document: dict):
        await self.collection.insert_one(document)
        return document

    async def add_action_if_new(self, plan_id, user_id: str, action: dict) -> bool:
        result = await self.collection.update_one(
            {
                "_id": plan_id,
                "user_id": user_id,
                "status": "DRAFT",
                "actions.event_key": {"$ne": action["event_key"]},
                "$expr": {"$lt": [{"$size": "$actions"}, 200]},
            },
            {
                "$push": {"actions": action},
                "$set": {"updated_at": action["updated_at"]},
                "$inc": {"version": 1},
            },
        )
        return result.modified_count == 1

    async def add_user_action(self, plan_id, user_id: str, vehicle_id, action: dict) -> bool:
        result = await self.collection.update_one(
            {
                "_id": plan_id,
                "user_id": user_id,
                "vehicle_id": vehicle_id,
                "status": {"$in": ["DRAFT", "ACTIVE"]},
                "actions.event_key": {"$ne": action["event_key"]},
                "actions.id": {"$ne": action["id"]},
                "$expr": {"$lt": [{"$size": "$actions"}, 200]},
            },
            {"$push": {"actions": action}, "$set": {"updated_at": action["updated_at"]}, "$inc": {"version": 1}},
        )
        return result.modified_count == 1

    async def update_plan_fields(self, plan_id, user_id: str, fields: dict):
        return await self.collection.find_one_and_update(
            {"_id": plan_id, "user_id": user_id, "status": {"$ne": "ARCHIVED"}},
            {"$set": fields, "$inc": {"version": 1}},
            return_document=ReturnDocument.AFTER,
        )

    async def archive_active_for_vehicle(self, user_id: str, vehicle_id, excluding_plan_id):
        await self.collection.update_many(
            {
                "user_id": user_id,
                "vehicle_id": vehicle_id,
                "status": "ACTIVE",
                "_id": {"$ne": excluding_plan_id},
            },
            {"$set": {"status": "ARCHIVED"}},
        )

    async def activate_plan(self, plan_id, user_id: str, vehicle_id, action_ids: list[str], event: dict):
        return await self.collection.find_one_and_update(
            {
                "_id": plan_id,
                "user_id": user_id,
                "vehicle_id": vehicle_id,
                "status": "DRAFT",
                "actions.id": {"$in": action_ids},
            },
            {
                "$inc": {"version": 1},
                "$set": {
                    "status": "ACTIVE",
                    "updated_at": event["changed_at"],
                    "actions.$[action].status": "PLANNED",
                    "actions.$[action].updated_at": event["changed_at"],
                },
                "$push": {"actions.$[action].status_history": event},
            },
            array_filters=[{"action.id": {"$in": action_ids}, "action.status": "PROPOSED"}],
            return_document=ReturnDocument.AFTER,
        )

    async def approve_actions(self, plan_id, user_id: str, vehicle_id, action_ids: list[str], event: dict):
        return await self.collection.find_one_and_update(
            {
                "_id": plan_id,
                "user_id": user_id,
                "vehicle_id": vehicle_id,
                "status": "ACTIVE",
                "actions": {"$elemMatch": {"id": {"$in": action_ids}, "status": "PROPOSED"}},
            },
            {
                "$inc": {"version": 1},
                "$set": {
                    "updated_at": event["changed_at"],
                    "actions.$[action].status": "PLANNED",
                    "actions.$[action].updated_at": event["changed_at"],
                },
                "$push": {"actions.$[action].status_history": {"$each": [event], "$slice": -100}},
            },
            array_filters=[{"action.id": {"$in": action_ids}, "action.status": "PROPOSED"}],
            return_document=ReturnDocument.AFTER,
        )

    async def update_actions_status(self, plan_id, user_id: str, vehicle_id, updates: list[dict], event: dict):
        # Each update is keyed by an action UUID. Action mutation stays inside the
        # owner/vehicle scoped plan document and uses Mongo's atomic array filters.
        for update in updates:
            await self.collection.update_one(
                {"_id": plan_id, "user_id": user_id, "vehicle_id": vehicle_id},
                {
                    "$set": {
                        "actions.$[action].status": update["status"],
                        "actions.$[action].updated_at": event["changed_at"],
                    },
                    "$push": {"actions.$[action].status_history": event},
                    "$inc": {"version": 1},
                },
                array_filters=[{"action.id": update["id"]}],
            )
        return await self.find_owned_plan(plan_id, user_id)

    async def update_action(self, plan_id, user_id: str, vehicle_id, action_id: str, fields: dict, event: dict | None = None, reopen_plan: bool = False):
        update = {"$set": {f"actions.$.{key}": value for key, value in fields.items()}, "$inc": {"version": 1}}
        changed_at = fields.get("updated_at")
        if event is not None:
            update["$push"] = {"actions.$.status_history": {"$each": [event], "$slice": -100}}
            update["$set"]["actions.$.updated_at"] = event["changed_at"]
            changed_at = event["changed_at"]
        if changed_at is not None:
            update["$set"]["updated_at"] = changed_at
        if reopen_plan:
            update["$set"]["status"] = "ACTIVE"
        return await self.collection.find_one_and_update(
            {
                "_id": plan_id,
                "user_id": user_id,
                "vehicle_id": vehicle_id,
                "actions.id": action_id,
            },
            update,
            return_document=ReturnDocument.AFTER,
        )

    async def dismiss_action_reminder(self, plan_id, user_id: str, vehicle_id, action_id: str, changed_at):
        event = {"event": "DISMISSED", "changed_at": changed_at}
        result = await self.collection.update_one(
            {
                "_id": plan_id,
                "user_id": user_id,
                "vehicle_id": vehicle_id,
                "actions": {"$elemMatch": {"id": action_id, "reminder.enabled": True, "reminder.status": "ACTIVE"}},
            },
            {
                "$set": {
                    "actions.$.reminder.status": "DISMISSED",
                    "actions.$.updated_at": changed_at,
                    "updated_at": changed_at,
                },
                "$push": {"actions.$.reminder.history": {"$each": [event], "$slice": -50}},
                "$inc": {"version": 1},
            },
        )
        return await self.find_owned_plan(plan_id, user_id), result.modified_count == 1

    async def mark_plan_completed_if_all_actions_done(self, plan_id, user_id: str, changed_at):
        await self.collection.update_one(
            {
                "_id": plan_id,
                "user_id": user_id,
                "status": "ACTIVE",
                "actions": {"$not": {"$elemMatch": {"status": {"$nin": ["COMPLETED", "SKIPPED", "CANCELLED", "REJECTED"]}}}},
            },
            {"$set": {"status": "COMPLETED", "updated_at": changed_at}, "$inc": {"version": 1}},
        )
