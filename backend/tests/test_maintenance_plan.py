import unittest
from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

from bson import ObjectId
from fastapi import HTTPException

from app.schemas.maintenance_plan import (
    ApprovePlanRequest,
    CompleteActionRequest,
    CreateUserActionRequest,
    GeneratePlanRequest,
    PlanStatus,
    ReminderSettings,
    SkipActionRequest,
    UpdateActionRequest,
)
from app.services.maintenance_plan_service import MaintenancePlanService


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The planner coroutine unexpectedly waited for I/O")


class MaintenancePlanServiceTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 9, tzinfo=timezone.utc)
        self.vehicle_id = ObjectId()
        self.vehicle = {
            "_id": self.vehicle_id,
            "user_id": "owner-a",
            "deleted_at": None,
            "manufacturer": "Perodua",
            "model": "Myvi",
            "year": 2020,
            "current_mileage": 50_000,
        }
        self.plan = {
            "_id": ObjectId(),
            "user_id": "owner-a",
            "vehicle_id": self.vehicle_id,
            "horizon_months": 6,
            "expected_monthly_mileage": None,
        }

    def build_service(self, visits):
        maintenance = SimpleNamespace(find_many=AsyncMock(return_value=visits))
        return MaintenancePlanService(
            plan_repository=object(),
            vehicle_repository=SimpleNamespace(find_one=AsyncMock(return_value=self.vehicle)),
            maintenance_repository=maintenance,
            maintenance_service=object(),
            predictive_service=object(),
            context_builder=object(),
            clock=lambda: self.now,
        )

    def visit(self, item_type, service_date, due_date=None, due_mileage=None, description=None):
        return {
            "_id": ObjectId(),
            "user_id": "owner-a",
            "vehicle_id": self.vehicle_id,
            "service_date": datetime.combine(service_date, datetime.min.time(), tzinfo=timezone.utc),
            "items": [{
                "type": item_type,
                "description": description,
                "next_due_date": datetime.combine(due_date, datetime.min.time(), tzinfo=timezone.utc) if due_date else None,
                "next_due_mileage": due_mileage,
            }],
        }

    def test_generation_uses_only_saved_schedules_and_never_invents_due_targets(self):
        service = self.build_service([
            self.visit("ENGINE_OIL", date(2026, 1, 1), due_date=date(2027, 2, 1), due_mileage=60_000),
            self.visit("COOLANT", date(2026, 2, 1), due_date=date(2027, 10, 1)),
            self.visit("TYRE", date(2026, 3, 1), due_mileage=80_000),
        ])
        actions = run_immediate_coroutine(service._schedule_actions(self.vehicle, self.plan, self.now))
        by_type = {action["maintenance_type"]: action for action in actions}

        self.assertEqual(set(by_type), {"ENGINE_OIL", "TYRE"})
        engine = by_type["ENGINE_OIL"]
        self.assertEqual(engine["target_date"], date(2027, 2, 1))
        self.assertEqual(engine["target_mileage"], 60_000)
        self.assertEqual(engine["status"], "PROPOSED")
        self.assertEqual(engine["source_due_date"], date(2027, 2, 1))
        self.assertIsNone(by_type["TYRE"]["target_date"])
        self.assertIn("timing is unknown", by_type["TYRE"]["description"])

    def test_expected_monthly_mileage_projects_only_mileage_due_and_uses_earliest_trigger(self):
        self.plan["expected_monthly_mileage"] = 1_000
        service = self.build_service([
            self.visit("ENGINE_OIL", date(2026, 1, 1), due_date=date(2027, 5, 1), due_mileage=52_000),
        ])
        actions = run_immediate_coroutine(service._schedule_actions(self.vehicle, self.plan, self.now))
        self.assertEqual(len(actions), 1)
        # 2,000 km at the owner's estimate arrives well before the saved date.
        self.assertTrue(actions[0]["target_date_estimated"])
        self.assertLess(actions[0]["target_date"], date(2027, 5, 1))
        self.assertEqual(actions[0]["trigger_basis"], "BOTH")
        self.assertEqual(actions[0]["source_due_date"], date(2027, 5, 1))

    def test_latest_record_per_type_wins_and_overdue_targets_are_not_moved_forward(self):
        service = self.build_service([
            self.visit("ENGINE_OIL", date(2026, 8, 1), due_date=date(2026, 10, 1), due_mileage=49_000),
            self.visit("ENGINE_OIL", date(2026, 1, 1), due_date=date(2026, 5, 1), due_mileage=45_000),
        ])
        actions = run_immediate_coroutine(service._schedule_actions(self.vehicle, self.plan, self.now))
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["source_due_date"], date(2026, 10, 1))
        self.assertEqual(actions[0]["source_due_mileage"], 49_000)
        self.assertEqual(actions[0]["priority"], "HIGH")
        self.assertEqual(actions[0]["status"], "PROPOSED")

    def test_cross_owner_vehicle_access_fails_before_plan_operations(self):
        vehicle_repo = SimpleNamespace(find_one=AsyncMock(return_value={**self.vehicle, "user_id": "owner-b"}))
        service = MaintenancePlanService(
            plan_repository=SimpleNamespace(list_for_vehicle=AsyncMock()),
            vehicle_repository=vehicle_repo,
            maintenance_repository=object(),
            maintenance_service=object(),
            predictive_service=object(),
            context_builder=object(),
            clock=lambda: self.now,
        )
        with self.assertRaises(HTTPException) as raised:
            run_immediate_coroutine(service.list_vehicle_plans(str(self.vehicle_id), "owner-a"))
        self.assertEqual(raised.exception.status_code, 403)

    def test_deleted_vehicle_is_not_available_for_planning(self):
        vehicle_repo = SimpleNamespace(find_one=AsyncMock(return_value={**self.vehicle, "deleted_at": self.now}))
        service = MaintenancePlanService(
            plan_repository=SimpleNamespace(list_for_vehicle=AsyncMock()),
            vehicle_repository=vehicle_repo,
            maintenance_repository=object(),
            maintenance_service=object(),
            predictive_service=object(),
            context_builder=object(),
            clock=lambda: self.now,
        )
        with self.assertRaises(HTTPException) as raised:
            run_immediate_coroutine(service.list_vehicle_plans(str(self.vehicle_id), "owner-a"))
        self.assertEqual(raised.exception.status_code, 404)

    def test_horizon_and_monthly_mileage_inputs_are_bounded(self):
        self.assertEqual(GeneratePlanRequest(horizon_months=3).horizon_months, 3)
        with self.assertRaises(ValueError):
            GeneratePlanRequest(horizon_months=9)
        with self.assertRaises(ValueError):
            GeneratePlanRequest(expected_monthly_mileage=0)

    def test_maintenance_plan_endpoints_require_authentication(self):
        from app.dependencies.auth_dependencies import get_current_user
        from app.routes.maintenance_plans import router
        self.assertGreaterEqual(len(router.routes), 15)
        for route in router.routes:
            self.assertIn(get_current_user, [dependency.call for dependency in route.dependant.dependencies])

    def test_predictive_actions_are_review_only_and_keep_validated_provenance(self):
        source = SimpleNamespace(url="https://www.perodua.com.my/maintenance", title="Myvi maintenance")
        quote = SimpleNamespace(source_url=source.url, quote="Exact text returned by a validated source.")
        recommendation = SimpleNamespace(
            risk_category=SimpleNamespace(value="MONITOR"),
            sources=[source], matched_excerpts=[quote],
            candidate_key="cooling_system", knowledge_entry=None,
            component_category="Cooling system", component="Coolant and cooling system",
        )
        report = SimpleNamespace(
            recommendations=[recommendation], knowledge_model_version="predictive-v1", knowledge_revision=2,
        )
        predictive = SimpleNamespace(get_cached_report=AsyncMock(return_value=report))
        context_builder = SimpleNamespace(build_conversation_context=AsyncMock(return_value=object()))
        service = MaintenancePlanService(
            plan_repository=object(), vehicle_repository=object(), maintenance_repository=object(),
            maintenance_service=object(), predictive_service=predictive, context_builder=context_builder,
            clock=lambda: self.now,
        )
        actions = run_immediate_coroutine(service._predictive_actions(str(self.vehicle_id), "owner-a", self.plan, self.now))
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["status"], "PROPOSED")
        self.assertEqual(actions[0]["recommendation_source"], "PREDICTIVE_REPORT")
        self.assertTrue(actions[0]["title"].startswith("Review sourced guidance"))
        self.assertEqual(actions[0]["source_references"][0]["url"], source.url)
        self.assertEqual(actions[0]["source_references"][0]["excerpt"], quote.quote)


class FakePlanRepository:
    def __init__(self):
        self.documents = {}

    async def insert_plan(self, document):
        self.documents[document["_id"]] = document
        return document

    async def find_plan_for_vehicle(self, user_id, vehicle_id, status):
        return next((doc for doc in self.documents.values() if doc["user_id"] == user_id and doc["vehicle_id"] == vehicle_id and doc["status"] == status), None)

    async def list_for_vehicle(self, user_id, vehicle_id):
        return [doc for doc in self.documents.values() if doc["user_id"] == user_id and doc["vehicle_id"] == vehicle_id]

    async def find_owned_plan(self, plan_id, user_id):
        doc = self.documents.get(plan_id)
        return doc if doc and doc["user_id"] == user_id else None

    async def add_action_if_new(self, plan_id, user_id, action):
        doc = await self.find_owned_plan(plan_id, user_id)
        if doc is None or doc["status"] != "DRAFT" or any(a["event_key"] == action["event_key"] for a in doc["actions"]):
            return False
        doc["actions"].append(action)
        doc["updated_at"] = action["updated_at"]
        return True

    async def add_user_action(self, plan_id, user_id, vehicle_id, action):
        doc = await self.find_owned_plan(plan_id, user_id)
        if not doc or str(doc["vehicle_id"]) != str(vehicle_id) or doc["status"] not in {"DRAFT", "ACTIVE"} or len(doc["actions"]) >= 200:
            return False
        doc["actions"].append(action)
        doc["version"] += 1
        return True

    async def update_plan_fields(self, plan_id, user_id, fields):
        doc = await self.find_owned_plan(plan_id, user_id)
        if doc is None or doc["status"] == "ARCHIVED":
            return None
        doc.update(fields)
        doc["version"] += 1
        return doc

    async def archive_active_for_vehicle(self, user_id, vehicle_id, excluding_plan_id):
        for doc in self.documents.values():
            if doc["user_id"] == user_id and doc["vehicle_id"] == vehicle_id and doc["_id"] != excluding_plan_id and doc["status"] == "ACTIVE":
                doc["status"] = "ARCHIVED"

    async def activate_plan(self, plan_id, user_id, vehicle_id, action_ids, event):
        doc = self.documents.get(plan_id)
        if not doc or doc["user_id"] != user_id or doc["vehicle_id"] != vehicle_id or doc["status"] != "DRAFT":
            return None
        doc["status"] = "ACTIVE"
        doc["updated_at"] = event["changed_at"]
        doc["version"] += 1
        for action in doc["actions"]:
            if action["id"] in action_ids and action["status"] == "PROPOSED":
                action["status"] = "PLANNED"
                action["status_history"].append(event)
        return doc

    async def approve_actions(self, plan_id, user_id, vehicle_id, action_ids, event):
        doc = self.documents.get(plan_id)
        if not doc or doc["user_id"] != user_id or doc["vehicle_id"] != vehicle_id or doc["status"] != "ACTIVE":
            return None
        for action in doc["actions"]:
            if action["id"] in action_ids and action["status"] == "PROPOSED":
                action["status"] = "PLANNED"
                action["status_history"].append(event)
        doc["updated_at"] = event["changed_at"]
        doc["version"] += 1
        return doc

    async def update_action(self, plan_id, user_id, vehicle_id, action_id, fields, event=None, reopen_plan=False):
        doc = self.documents.get(plan_id)
        if not doc or doc["user_id"] != user_id or doc["vehicle_id"] != vehicle_id:
            return None
        action = next((item for item in doc["actions"] if item["id"] == action_id), None)
        if action is None:
            return None
        for key, value in fields.items():
            if "." in key:
                parent, child = key.split(".", 1)
                action.setdefault(parent, {})[child] = value
            else:
                action[key] = value
        if event:
            action["status_history"].append(event)
            action["updated_at"] = event["changed_at"]
        if reopen_plan:
            doc["status"] = "ACTIVE"
        doc["version"] += 1
        return doc

    async def mark_plan_completed_if_all_actions_done(self, plan_id, user_id, changed_at):
        doc = await self.find_owned_plan(plan_id, user_id)
        if doc and doc["actions"] and all(action["status"] in {"COMPLETED", "SKIPPED", "CANCELLED", "REJECTED"} for action in doc["actions"]):
            doc["status"] = "COMPLETED"
            doc["updated_at"] = changed_at
            doc["version"] += 1


class MaintenancePlanWorkflowTests(MaintenancePlanServiceTests):
    def setUp(self):
        super().setUp()
        self.plan_repository = FakePlanRepository()
        self.vehicle_repository = SimpleNamespace(
            find_one=AsyncMock(return_value=self.vehicle),
            update=AsyncMock(),
        )
        self.maintenance_repository = SimpleNamespace(
            find_many=AsyncMock(return_value=[self.visit("ENGINE_OIL", date(2026, 1, 1), due_date=date(2027, 1, 1), due_mileage=60_000)]),
            find_by_action_id=AsyncMock(return_value=None),
        )
        self.service_record_writer = SimpleNamespace(create_service_visit=AsyncMock(return_value=SimpleNamespace(id="service-visit-1")))
        self.context_builder = SimpleNamespace(build_conversation_context=AsyncMock(return_value=object()))
        self.predictive = SimpleNamespace(get_cached_report=AsyncMock(return_value=None))
        self.service = MaintenancePlanService(
            plan_repository=self.plan_repository,
            vehicle_repository=self.vehicle_repository,
            maintenance_repository=self.maintenance_repository,
            maintenance_service=self.service_record_writer,
            predictive_service=self.predictive,
            context_builder=self.context_builder,
            clock=lambda: self.now,
        )

    def test_generation_is_draft_and_repeat_generation_deduplicates_schedule_actions(self):
        request = GeneratePlanRequest(horizon_months=6)
        first = run_immediate_coroutine(self.service.generate_plan(str(self.vehicle_id), "owner-a", request))
        second = run_immediate_coroutine(self.service.generate_plan(str(self.vehicle_id), "owner-a", request))
        self.assertEqual(first.status, PlanStatus.DRAFT)
        self.assertEqual(len(first.actions), 1)
        self.assertEqual(len(second.actions), 1)
        self.assertEqual(second.actions[0].status.value, "PROPOSED")

    def test_approval_requires_selected_proposals_and_activates_only_selected_actions(self):
        plan = run_immediate_coroutine(self.service.generate_plan(
            str(self.vehicle_id), "owner-a", GeneratePlanRequest(),
        ))
        action_id = plan.actions[0].id
        active = run_immediate_coroutine(self.service.approve_plan(plan.id, "owner-a", ApprovePlanRequest(action_ids=[action_id])))
        self.assertEqual(active.status, PlanStatus.ACTIVE)
        self.assertEqual(active.actions[0].status.value, "PLANNED")

    def test_active_plan_can_approve_remaining_proposed_actions(self):
        plan = run_immediate_coroutine(self.service.generate_plan(str(self.vehicle_id), "owner-a", GeneratePlanRequest()))
        action_id = plan.actions[0].id
        run_immediate_coroutine(self.service.approve_plan(plan.id, "owner-a", ApprovePlanRequest(action_ids=[action_id])))
        personal = run_immediate_coroutine(self.service.create_user_action(plan.id, "owner-a", CreateUserActionRequest(title="Inspect noise")))
        created = next(action for action in personal.actions if action.title == "Inspect noise")
        self.assertEqual(created.status.value, "PROPOSED")
        approved = run_immediate_coroutine(self.service.approve_plan(plan.id, "owner-a", ApprovePlanRequest(action_ids=[created.id])))
        self.assertEqual(approved.status, PlanStatus.ACTIVE)
        self.assertEqual(next(action for action in approved.actions if action.id == created.id).status.value, "PLANNED")

    def test_completion_can_finish_without_service_record_and_updates_vehicle_mileage(self):
        plan = run_immediate_coroutine(self.service.generate_plan(str(self.vehicle_id), "owner-a", GeneratePlanRequest()))
        action_id = plan.actions[0].id
        plan = run_immediate_coroutine(self.service.approve_plan(plan.id, "owner-a", ApprovePlanRequest(action_ids=[action_id])))
        request = CompleteActionRequest(
            completion_date=date(2026, 11, 8), actual_mileage=51_000,
            work_performed="Changed engine oil", create_service_record=False,
        )
        completed = run_immediate_coroutine(self.service.complete_action(plan.id, action_id, "owner-a", request))
        self.assertEqual(completed.actions[0].status.value, "COMPLETED")
        self.assertIsNone(completed.actions[0].service_visit_id)
        self.service_record_writer.create_service_visit.assert_not_awaited()
        self.vehicle_repository.update.assert_awaited_once()
        self.assertEqual(completed.actions[0].source_due_mileage, 60_000)

    def test_completion_confirmation_creates_one_linked_service_visit(self):
        plan = run_immediate_coroutine(self.service.generate_plan(str(self.vehicle_id), "owner-a", GeneratePlanRequest()))
        action_id = plan.actions[0].id
        plan = run_immediate_coroutine(self.service.approve_plan(plan.id, "owner-a", ApprovePlanRequest(action_ids=[action_id])))
        request = CompleteActionRequest(
            completion_date=date(2026, 11, 8), actual_mileage=51_000,
            work_performed="Changed engine oil", create_service_record=True,
        )
        completed = run_immediate_coroutine(self.service.complete_action(plan.id, action_id, "owner-a", request))
        self.assertEqual(completed.actions[0].service_visit_id, "service-visit-1")
        args = self.service_record_writer.create_service_visit.await_args
        self.assertEqual(args.kwargs["maintenance_action_id"], action_id)
        self.assertEqual(args.args[1].items[0].next_due_mileage, 60_000)

    def test_reminder_must_match_an_existing_target(self):
        plan = run_immediate_coroutine(self.service.generate_plan(str(self.vehicle_id), "owner-a", GeneratePlanRequest()))
        action_id = plan.actions[0].id
        run_immediate_coroutine(self.service.approve_plan(plan.id, "owner-a", ApprovePlanRequest(action_ids=[action_id])))
        user_action = run_immediate_coroutine(self.service.create_user_action(plan.id, "owner-a", CreateUserActionRequest(title="Inspect noise")))
        user_action_id = next(action.id for action in user_action.actions if action.title == "Inspect noise")
        run_immediate_coroutine(self.service.approve_plan(plan.id, "owner-a", ApprovePlanRequest(action_ids=[user_action_id])))
        with self.assertRaises(HTTPException) as raised:
            run_immediate_coroutine(self.service.update_action(
                plan.id, user_action_id, "owner-a",
                UpdateActionRequest(reminder=ReminderSettings(enabled=True, advance_days=30)),
            ))
        self.assertEqual(raised.exception.status_code, 422)

    def test_last_skipped_action_completes_plan_and_restore_reopens_it(self):
        plan = run_immediate_coroutine(self.service.generate_plan(str(self.vehicle_id), "owner-a", GeneratePlanRequest()))
        action_id = plan.actions[0].id
        active = run_immediate_coroutine(self.service.approve_plan(plan.id, "owner-a", ApprovePlanRequest(action_ids=[action_id])))
        skipped = run_immediate_coroutine(self.service.skip_action(plan.id, action_id, "owner-a", SkipActionRequest(reason="Deferred")))
        self.assertEqual(skipped.status, PlanStatus.COMPLETED)
        restored = run_immediate_coroutine(self.service.restore_skipped_action(plan.id, action_id, "owner-a"))
        self.assertEqual(restored.status, PlanStatus.ACTIVE)
        self.assertEqual(restored.actions[0].status.value, "PLANNED")



if __name__ == "__main__":
    unittest.main()
