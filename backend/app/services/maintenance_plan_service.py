import hashlib
import math
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.ai.context_builder import VehicleContextBuilder
from app.ai.predictive_maintenance_service import PredictiveMaintenanceService
from app.repositories.maintenance_plan_repository import MaintenancePlanRepository
from app.repositories.maintenance_repository import MaintenanceRepository
from app.repositories.maintenance_knowledge_repository import MaintenanceKnowledgeRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.maintenance import MaintenanceItemCreate, MaintenanceType, ServiceVisitCreate
from app.schemas.maintenance_plan import (
    ActionPriority, ActionSource, ActionStatus, ActionStatusEvent, ActionType,
    ApprovePlanRequest, CompleteActionRequest, CreateUserActionRequest,
    GeneratePlanRequest, MaintenancePlan, MaintenancePlanAction, PlanStatus,
    ReminderSettings, ReminderStatus, RescheduleActionRequest,
    ReviewActionRequest, SkipActionRequest, TriggerBasis, UpdateActionRequest,
)
from app.services.maintenance_service import MaintenanceService
from app.services.maintenance_status import calculate_maintenance_status
from app.shared.utils.mongodb import to_object_id
from app.shared.utils.serialization import serialize_document


TYPE_LABELS = {
    "ENGINE_OIL": "Engine oil", "OIL_FILTER": "Oil filter", "AIR_FILTER": "Air filter",
    "CABIN_FILTER": "Cabin filter", "BRAKE_SERVICE": "Brake service", "BRAKE_FLUID": "Brake fluid",
    "COOLANT": "Coolant", "TRANSMISSION": "Transmission service", "BATTERY": "Battery",
    "TYRE": "Tyres", "ALIGNMENT": "Wheel alignment", "SPARK_PLUG": "Spark plugs",
    "TIMING_BELT": "Timing belt", "INSPECTION": "Inspection", "OTHER": "Other",
}


def _as_date(value) -> date | None:
    if value is None:
        return None
    return value.date() if isinstance(value, datetime) else value


def _mongo_value(value):
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)
    if isinstance(value, dict):
        return {key: _mongo_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_mongo_value(item) for item in value]
    return value


class MaintenancePlanService:
    def __init__(
        self,
        plan_repository=None,
        vehicle_repository=None,
        maintenance_repository=None,
        maintenance_service=None,
        predictive_service=None,
        context_builder=None,
        clock=None,
    ):
        self.plans = plan_repository or MaintenancePlanRepository()
        self.vehicles = vehicle_repository or VehicleRepository()
        self.maintenance = maintenance_repository or MaintenanceRepository()
        self.maintenance_service = maintenance_service or MaintenanceService()
        self.predictive = predictive_service or PredictiveMaintenanceService(
            repository=MaintenanceKnowledgeRepository()
        )
        self.context_builder = context_builder or VehicleContextBuilder()
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    async def list_vehicle_plans(self, vehicle_id: str, user_id: str):
        vehicle = await self._owned_vehicle(vehicle_id, user_id)
        plans = await self.plans.list_for_vehicle(user_id, vehicle["_id"])
        return [self._response(plan, vehicle) for plan in plans]

    async def get_plan(self, plan_id: str, user_id: str):
        plan = await self._owned_plan(plan_id, user_id)
        vehicle = await self._owned_vehicle(str(plan["vehicle_id"]), user_id)
        return self._response(plan, vehicle)

    async def generate_plan(self, vehicle_id: str, user_id: str, request: GeneratePlanRequest):
        vehicle = await self._owned_vehicle(vehicle_id, user_id)
        now = self.clock()
        draft = await self.plans.find_plan_for_vehicle(user_id, vehicle["_id"], PlanStatus.DRAFT.value)
        if draft is None:
            plan_id = ObjectId()
            draft = {
                "_id": plan_id,
                "user_id": user_id,
                "vehicle_id": vehicle["_id"],
                "name": request.name,
                "status": PlanStatus.DRAFT.value,
                "horizon_months": request.horizon_months,
                "expected_monthly_mileage": request.expected_monthly_mileage,
                "version": 1,
                "actions": [],
                "created_at": now,
                "updated_at": now,
            }
            await self.plans.insert_plan(draft)
        else:
            draft = await self.plans.update_plan_fields(
                draft["_id"], user_id,
                {"name": request.name, "horizon_months": request.horizon_months,
                 "expected_monthly_mileage": request.expected_monthly_mileage, "updated_at": now},
            )

        candidates = await self._schedule_actions(vehicle, draft, now)
        candidates.extend(await self._predictive_actions(vehicle_id, user_id, draft, now))
        for action in candidates:
            await self.plans.add_action_if_new(draft["_id"], user_id, _mongo_value(action))

        refreshed = await self.plans.find_owned_plan(draft["_id"], user_id)
        return self._response(refreshed, vehicle)

    async def create_user_action(self, plan_id: str, user_id: str, request: CreateUserActionRequest):
        plan = await self._owned_plan(plan_id, user_id)
        if plan["status"] in {PlanStatus.ARCHIVED.value, PlanStatus.COMPLETED.value}:
            raise HTTPException(status_code=409, detail="This plan is not accepting new actions.")
        if len(plan.get("actions", [])) >= 200:
            raise HTTPException(status_code=409, detail="This plan already contains the maximum number of actions.")
        vehicle = await self._owned_vehicle(str(plan["vehicle_id"]), user_id)
        now = self.clock()
        action = self._base_action(plan, user_id, now, event_key=f"user:{uuid4()}")
        action.update({
            "maintenance_type": request.maintenance_type.value,
            "category": request.category,
            "component": request.category,
            "title": request.title.strip(),
            "description": request.description,
            "action_type": ActionType.USER_CREATED.value,
            "recommendation_source": ActionSource.USER.value,
            "priority": request.priority.value,
            "target_date": request.target_date,
            "target_mileage": request.target_mileage,
            "trigger_basis": self._trigger_basis(request.target_date, request.target_mileage).value,
            "notes": request.notes,
        })
        changed = await self.plans.add_user_action(plan["_id"], user_id, vehicle["_id"], _mongo_value(action))
        if not changed:
            raise HTTPException(status_code=409, detail="Unable to add this action to the plan.")
        refreshed = await self.plans.find_owned_plan(plan["_id"], user_id)
        return self._response(refreshed, vehicle)

    async def approve_plan(self, plan_id: str, user_id: str, request: ApprovePlanRequest):
        plan = await self._owned_plan(plan_id, user_id)
        if plan["status"] not in {PlanStatus.DRAFT.value, PlanStatus.ACTIVE.value}:
            raise HTTPException(status_code=409, detail="Only a draft or active plan can approve proposed actions.")
        proposals = [action for action in plan.get("actions", []) if action.get("status") == ActionStatus.PROPOSED.value]
        selected = request.action_ids if request.action_ids is not None else [action["id"] for action in proposals]
        if not selected:
            raise HTTPException(status_code=400, detail="Select at least one proposed action to approve.")
        proposed_ids = {action["id"] for action in proposals}
        if not set(selected).issubset(proposed_ids):
            raise HTTPException(status_code=400, detail="Only proposed actions in this plan can be approved.")

        now = self.clock()
        event = {"status": ActionStatus.PLANNED.value, "changed_at": now, "reason": "Approved by vehicle owner."}
        try:
            if plan["status"] == PlanStatus.DRAFT.value:
                await self.plans.archive_active_for_vehicle(user_id, plan["vehicle_id"], plan["_id"])
                activated = await self.plans.activate_plan(plan["_id"], user_id, plan["vehicle_id"], selected, event)
            else:
                activated = await self.plans.approve_actions(plan["_id"], user_id, plan["vehicle_id"], selected, event)
        except DuplicateKeyError as exc:
            raise HTTPException(status_code=409, detail="Another active plan was activated concurrently. Refresh and try again.") from exc
        if activated is None:
            raise HTTPException(status_code=409, detail="The draft changed before it could be approved.")
        vehicle = await self._owned_vehicle(str(plan["vehicle_id"]), user_id)
        return self._response(activated, vehicle)

    async def review_action(self, plan_id: str, action_id: str, user_id: str, request: ReviewActionRequest):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        if action["status"] != ActionStatus.PROPOSED.value:
            raise HTTPException(status_code=409, detail="Only a proposed action can be reviewed.")
        if request.accepted and plan["status"] == PlanStatus.DRAFT.value:
            result = await self.approve_plan(plan_id, user_id, ApprovePlanRequest(action_ids=[action_id]))
            return result
        now = self.clock()
        next_status = ActionStatus.PLANNED.value if request.accepted else ActionStatus.REJECTED.value
        event = self._event(next_status, now, request.reason or ("Approved by vehicle owner." if request.accepted else "Rejected by vehicle owner."))
        updated = await self.plans.update_action(plan["_id"], user_id, vehicle["_id"], action_id,
                                                 {"status": next_status}, event)
        if not request.accepted:
            return await self._close_plan_if_done(plan, user_id, vehicle, updated, now)
        return self._response(updated, vehicle)

    async def update_action(self, plan_id: str, action_id: str, user_id: str, request: UpdateActionRequest):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        if action["status"] not in {ActionStatus.PROPOSED.value, ActionStatus.PLANNED.value, ActionStatus.SCHEDULED.value}:
            raise HTTPException(status_code=409, detail="This action can no longer be edited.")
        fields = request.model_dump(exclude_unset=True, mode="python")
        for key in ("priority",):
            if key in fields and fields[key] is not None:
                fields[key] = fields[key].value
        if "reminder" in fields and fields["reminder"] is not None:
            reminder_input = fields["reminder"]
            reminder = reminder_input.model_dump(mode="python") if hasattr(reminder_input, "model_dump") else dict(reminder_input)
            reminder_date_target = fields.get("scheduled_date", action.get("scheduled_date")) or fields.get("target_date", action.get("target_date"))
            reminder_mileage_target = fields.get("target_mileage", action.get("target_mileage"))
            if reminder["enabled"] and not (
                (reminder_date_target is not None and reminder["advance_days"] is not None)
                or (reminder_mileage_target is not None and reminder["advance_km"] is not None)
            ):
                raise HTTPException(status_code=422, detail="An enabled reminder must match an action date or mileage target.")
            previous_history = list(action.get("reminder", {}).get("history", []))
            previous_history.append({"event": "UPDATED" if reminder["enabled"] else "DISABLED", "changed_at": self.clock()})
            reminder["history"] = previous_history[-50:]
            reminder["status"] = ReminderStatus.ACTIVE.value
            fields["reminder"] = reminder
        elif "target_date" in fields or "target_mileage" in fields or "scheduled_date" in fields:
            reminder = action.get("reminder") or {}
            reminder_date_target = fields.get("scheduled_date", action.get("scheduled_date")) or fields.get("target_date", action.get("target_date"))
            reminder_mileage_target = fields.get("target_mileage", action.get("target_mileage"))
            if reminder.get("enabled") and not (
                (reminder_date_target is not None and reminder.get("advance_days") is not None)
                or (reminder_mileage_target is not None and reminder.get("advance_km") is not None)
            ):
                raise HTTPException(status_code=422, detail="Disable or update the reminder before removing its target.")
        if "target_date" in fields or "target_mileage" in fields:
            due_date = fields.get("target_date", action.get("target_date"))
            due_mileage = fields.get("target_mileage", action.get("target_mileage"))
            fields["trigger_basis"] = self._trigger_basis(due_date, due_mileage).value
        fields["updated_at"] = self.clock()
        updated = await self.plans.update_action(plan["_id"], user_id, vehicle["_id"], action_id, _mongo_value(fields))
        return self._response(updated, vehicle)

    async def reschedule_action(self, plan_id: str, action_id: str, user_id: str, request: RescheduleActionRequest):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        self._assert_open_action(action)
        fields = request.model_dump(exclude_unset=True, mode="python")
        reason = fields.pop("reason")
        if "target_date" not in fields:
            fields.pop("target_date", None)
        if "target_mileage" not in fields:
            fields.pop("target_mileage", None)
        target_date = fields.get("target_date", action.get("target_date"))
        target_mileage = fields.get("target_mileage", action.get("target_mileage"))
        fields["trigger_basis"] = self._trigger_basis(target_date, target_mileage).value
        fields["status"] = ActionStatus.SCHEDULED.value
        reminder = dict(action.get("reminder") or {})
        if reminder.get("enabled"):
            reminder_history = list(reminder.get("history", []))
            reminder_history.append({"event": "RESCHEDULED", "changed_at": self.clock()})
            reminder["status"] = ReminderStatus.ACTIVE.value
            reminder["history"] = reminder_history[-50:]
            fields["reminder"] = reminder
        event = self._event(ActionStatus.SCHEDULED.value, self.clock(), reason)
        updated = await self.plans.update_action(plan["_id"], user_id, vehicle["_id"], action_id, _mongo_value(fields), event)
        return self._response(updated, vehicle)

    async def skip_action(self, plan_id: str, action_id: str, user_id: str, request: SkipActionRequest):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        self._assert_open_action(action)
        now = self.clock()
        updated = await self.plans.update_action(plan["_id"], user_id, vehicle["_id"], action_id,
                                                 {"status": ActionStatus.SKIPPED.value, "skip_reason": request.reason},
                                                 self._event(ActionStatus.SKIPPED.value, now, request.reason))
        return await self._close_plan_if_done(plan, user_id, vehicle, updated, now)

    async def restore_skipped_action(self, plan_id: str, action_id: str, user_id: str):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        if action["status"] != ActionStatus.SKIPPED.value:
            raise HTTPException(status_code=409, detail="Only a skipped action can be restored.")
        now = self.clock()
        updated = await self.plans.update_action(plan["_id"], user_id, vehicle["_id"], action_id,
                                                 {"status": ActionStatus.PLANNED.value, "skip_reason": None},
                                                 self._event(ActionStatus.PLANNED.value, now, "Restored by vehicle owner."),
                                                 reopen_plan=plan["status"] == PlanStatus.COMPLETED.value)
        return self._response(updated, vehicle)

    async def cancel_action(self, plan_id: str, action_id: str, user_id: str, request: SkipActionRequest):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        self._assert_open_action(action)
        now = self.clock()
        updated = await self.plans.update_action(plan["_id"], user_id, vehicle["_id"], action_id,
                                                 {"status": ActionStatus.CANCELLED.value},
                                                 self._event(ActionStatus.CANCELLED.value, now, request.reason))
        return await self._close_plan_if_done(plan, user_id, vehicle, updated, now)

    async def start_action(self, plan_id: str, action_id: str, user_id: str):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        if action["status"] not in {ActionStatus.PLANNED.value, ActionStatus.SCHEDULED.value}:
            raise HTTPException(status_code=409, detail="Only a planned or scheduled action can be started.")
        now = self.clock()
        updated = await self.plans.update_action(plan["_id"], user_id, vehicle["_id"], action_id,
                                                 {"status": ActionStatus.IN_PROGRESS.value},
                                                 self._event(ActionStatus.IN_PROGRESS.value, now, "Work started by vehicle owner."))
        return self._response(updated, vehicle)

    async def complete_action(self, plan_id: str, action_id: str, user_id: str, request: CompleteActionRequest):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        if action["status"] == ActionStatus.COMPLETED.value:
            return self._response(plan, vehicle)
        if action["status"] not in {ActionStatus.PLANNED.value, ActionStatus.SCHEDULED.value, ActionStatus.IN_PROGRESS.value}:
            raise HTTPException(status_code=409, detail="Approve or schedule this action before completing it.")
        if request.actual_mileage < vehicle["current_mileage"]:
            raise HTTPException(status_code=422, detail="Completion mileage cannot be lower than the vehicle's current mileage.")

        service_visit_id = action.get("service_visit_id")
        linked_visit = None
        if request.create_service_record and service_visit_id is None:
            existing_link = await self.maintenance.find_by_action_id(action_id)
            if existing_link is not None:
                linked_visit = existing_link
                service_visit_id = str(existing_link["_id"])
            else:
                maintenance_type = action.get("maintenance_type") or MaintenanceType.OTHER.value
                next_due_date = request.next_due_date or action.get("source_due_date")
                next_due_mileage = request.next_due_mileage if request.next_due_mileage is not None else action.get("source_due_mileage")
                visit = ServiceVisitCreate(
                    vehicle_id=str(vehicle["_id"]),
                    service_date=request.completion_date,
                    mileage_at_service=request.actual_mileage,
                    workshop=request.service_provider,
                    notes=request.notes,
                    items=[MaintenanceItemCreate(
                        type=maintenance_type,
                        description=request.work_performed,
                        cost=request.actual_cost,
                        notes=request.notes,
                        next_due_date=next_due_date,
                        next_due_mileage=next_due_mileage,
                    )],
                )
                try:
                    created_visit = await self.maintenance_service.create_service_visit(
                        user_id, visit, maintenance_action_id=action_id,
                    )
                    service_visit_id = created_visit.id
                except DuplicateKeyError:
                    existing_link = await self.maintenance.find_by_action_id(action_id)
                    if existing_link is None:
                        raise
                    linked_visit = existing_link
                    service_visit_id = str(existing_link["_id"])
        elif request.create_service_record:
            linked_visit = await self.maintenance.find_by_action_id(action_id)

        linked_item = (linked_visit or {}).get("items", [{}])[0] if linked_visit is not None else {}
        recorded_service_date = _as_date((linked_visit or {}).get("service_date")) if linked_visit is not None else None

        now = self.clock()
        fields = {
            "status": ActionStatus.COMPLETED.value,
            "completion_date": recorded_service_date or request.completion_date,
            "completion_mileage": (linked_visit or {}).get("mileage_at_service", request.actual_mileage),
            "work_performed": linked_item.get("description", request.work_performed),
            "service_provider": (linked_visit or {}).get("workshop", request.service_provider),
            "actual_cost": linked_item.get("cost", request.actual_cost),
            "notes": (linked_visit or {}).get("notes", request.notes if request.notes is not None else action.get("notes")),
            "component_replaced": request.component_replaced,
            "service_visit_id": service_visit_id,
        }
        updated = await self.plans.update_action(plan["_id"], user_id, vehicle["_id"], action_id,
                                                 _mongo_value(fields), self._event(ActionStatus.COMPLETED.value, now, "Marked complete by vehicle owner."))
        if updated is None:
            raise HTTPException(status_code=404, detail="Maintenance action not found.")
        if request.actual_mileage > vehicle["current_mileage"]:
            await self.vehicles.update({"_id": vehicle["_id"], "user_id": user_id}, {
                "current_mileage": request.actual_mileage,
                "updated_at": now,
            })
        await self.plans.mark_plan_completed_if_all_actions_done(plan["_id"], user_id, now)
        # A linked service visit uses the same vehicle and owner. Its unique action
        # reference makes repeated completion requests safe if the process stopped
        # after inserting the visit but before updating this plan document.
        return await self.get_plan(plan_id, user_id)

    async def dismiss_reminder(self, plan_id: str, action_id: str, user_id: str):
        plan, vehicle, action = await self._owned_action(plan_id, action_id, user_id)
        if not action.get("reminder", {}).get("enabled"):
            raise HTTPException(status_code=409, detail="This action has no active reminder.")
        now = self.clock()
        updated, _ = await self.plans.dismiss_action_reminder(plan["_id"], user_id, vehicle["_id"], action_id, now)
        return self._response(updated, vehicle)

    async def vehicle_timeline(self, vehicle_id: str, user_id: str):
        vehicle = await self._owned_vehicle(vehicle_id, user_id)
        plans = await self.plans.list_for_vehicle(user_id, vehicle["_id"])
        actions = []
        for plan in plans:
            response = self._response(plan, vehicle)
            actions.extend(response.actions)
        actions.sort(key=lambda action: (
            action.target_date or action.scheduled_date or action.completion_date or date.max,
            action.target_mileage if action.target_mileage is not None else 2**63,
            action.created_at,
        ))
        return actions

    async def _close_plan_if_done(self, plan: dict, user_id: str, vehicle: dict, updated: dict, now: datetime):
        if plan["status"] == PlanStatus.ACTIVE.value:
            await self.plans.mark_plan_completed_if_all_actions_done(plan["_id"], user_id, now)
            refreshed = await self.plans.find_owned_plan(plan["_id"], user_id)
            return self._response(refreshed or updated, vehicle)
        return self._response(updated, vehicle)

    async def archive_plan(self, plan_id: str, user_id: str):
        plan = await self._owned_plan(plan_id, user_id)
        now = self.clock()
        updated = await self.plans.update_plan_fields(plan["_id"], user_id, {"status": PlanStatus.ARCHIVED.value, "updated_at": now})
        vehicle = await self._owned_vehicle(str(plan["vehicle_id"]), user_id)
        return self._response(updated, vehicle)

    async def _schedule_actions(self, vehicle: dict, plan: dict, now: datetime):
        visits = await self.maintenance.find_many({
            "user_id": str(vehicle["user_id"]),
            "vehicle_id": vehicle["_id"],
        })
        latest_by_type = {}
        visits.sort(key=lambda visit: _as_date(visit.get("service_date")) or date.min, reverse=True)
        for visit in visits:
            for item in visit.get("items", []):
                item_type = getattr(item.get("type"), "value", item.get("type"))
                if item_type in MaintenanceType._value2member_map_:
                    latest_by_type.setdefault(item_type, (visit, item))

        now_date = now.date()
        horizon_end = self._add_months(now_date, plan["horizon_months"])
        monthly = plan.get("expected_monthly_mileage")
        candidates = []
        for item_type, (visit, item) in latest_by_type.items():
            due_date = _as_date(item.get("next_due_date"))
            due_mileage = item.get("next_due_mileage")
            if due_date is None and due_mileage is None:
                continue
            maintenance_type = MaintenanceType(item_type)

            # The planner uses the earliest explicitly recorded trigger when a
            # schedule contains both a date and mileage target.
            if due_date is not None and due_mileage is not None:
                schedule_status = "OVERDUE" if now_date >= due_date or vehicle["current_mileage"] >= due_mileage else "UPCOMING"
            else:
                status_value = calculate_maintenance_status(
                    maintenance_type, due_date, due_mileage,
                    vehicle["current_mileage"], today=now_date,
                )
                if status_value is None:
                    continue
                schedule_status = status_value.value

            projected_date = None
            if due_mileage is not None and monthly:
                remaining = max(0, due_mileage - vehicle["current_mileage"])
                projected_date = now_date + timedelta(days=math.ceil(remaining / monthly * 30.4375))
            target_date_candidates = [value for value in (due_date, projected_date) if value is not None]
            target_date = min(target_date_candidates) if target_date_candidates else None
            mileage_timing_unknown = due_mileage is not None and monthly is None
            if schedule_status != "OVERDUE" and target_date is not None and target_date > horizon_end and not mileage_timing_unknown:
                continue

            basis = self._trigger_basis(due_date, due_mileage)
            label = TYPE_LABELS.get(item_type, item_type.replace("_", " ").title())
            now_event = {"status": ActionStatus.PROPOSED.value, "changed_at": now, "reason": "Generated from a saved maintenance schedule; owner approval required."}
            action = self._base_action(plan, str(vehicle["user_id"]), now, event_key=self._schedule_event_key(item_type, due_date, due_mileage))
            action.update({
                "maintenance_type": item_type,
                "category": label,
                "component": label,
                "title": f"{label} due",
                "description": item.get("description") or "This action is based on the next-due target entered in your saved service history.",
                "action_type": ActionType.SCHEDULED_SERVICE.value,
                "recommendation_source": ActionSource.EXISTING_SCHEDULE.value,
                "priority": ActionPriority.HIGH.value if schedule_status == "OVERDUE" else ActionPriority.NORMAL.value,
                "trigger_basis": basis.value,
                "target_date": target_date,
                "target_date_estimated": projected_date is not None and (due_date is None or projected_date < due_date),
                "target_mileage": due_mileage,
                "source_due_date": due_date,
                "source_due_mileage": due_mileage,
                "status_history": [now_event],
            })
            if mileage_timing_unknown:
                action["description"] = f"{action['description']} Calendar timing is unknown because no monthly mileage estimate was provided."
            candidates.append(action)
        return candidates

    async def _predictive_actions(self, vehicle_id: str, user_id: str, plan: dict, now: datetime):
        try:
            context = await self.context_builder.build_conversation_context(vehicle_id, user_id)
            report = await self.predictive.get_cached_report(user_id, vehicle_id, context)
        except HTTPException:
            raise
        if report is None:
            return []
        actions = []
        for recommendation in report.recommendations:
            # Current Phase 3 output does not independently establish a repair
            # task. A report-backed item is therefore framed as source review;
            # the owner must decide and approve before it becomes planned work.
            if recommendation.risk_category.value != "MONITOR" or not recommendation.sources or not recommendation.matched_excerpts:
                continue
            source_references = []
            for source in recommendation.sources:
                excerpts = [quote.quote for quote in recommendation.matched_excerpts if quote.source_url == source.url]
                source_references.extend({"title": source.title, "url": source.url, "excerpt": excerpt} for excerpt in excerpts[:3])
            source_refs = source_references[:8]
            digest = hashlib.sha256((recommendation.candidate_key + "|" + "|".join(ref["url"] for ref in source_refs)).encode()).hexdigest()[:24]
            event_key = f"predictive:{report.knowledge_model_version}:{report.knowledge_revision}:{digest}"
            action = self._base_action(plan, user_id, now, event_key=event_key)
            action.update({
                "maintenance_type": MaintenanceType.INSPECTION.value,
                "category": recommendation.component_category,
                "component": recommendation.component,
                "title": f"Review sourced guidance: {recommendation.component}",
                "description": "Unreviewed research excerpts are available. Open the original sources and decide whether any action applies to this vehicle.",
                "action_type": ActionType.RESEARCH_RECOMMENDATION.value,
                "recommendation_source": ActionSource.PREDICTIVE_REPORT.value,
                "source_references": source_refs,
                "priority": ActionPriority.NORMAL.value,
            })
            actions.append(action)
        return actions

    async def _owned_vehicle(self, vehicle_id: str, user_id: str):
        vehicle = await self.vehicles.find_one({"_id": to_object_id(vehicle_id)})
        if vehicle is None or vehicle.get("deleted_at") is not None:
            raise HTTPException(status_code=404, detail="Vehicle not found.")
        if str(vehicle.get("user_id")) != user_id:
            raise HTTPException(status_code=403, detail="Access denied.")
        return vehicle

    async def _owned_plan(self, plan_id: str, user_id: str):
        plan = await self.plans.find_owned_plan(to_object_id(plan_id), user_id)
        if plan is None:
            raise HTTPException(status_code=404, detail="Maintenance plan not found.")
        vehicle = await self._owned_vehicle(str(plan["vehicle_id"]), user_id)
        if str(plan["vehicle_id"]) != str(vehicle["_id"]):
            raise HTTPException(status_code=404, detail="Maintenance plan not found.")
        return plan

    async def _owned_action(self, plan_id: str, action_id: str, user_id: str):
        plan = await self._owned_plan(plan_id, user_id)
        action = next((item for item in plan.get("actions", []) if item.get("id") == action_id), None)
        if action is None or action.get("plan_id") != str(plan["_id"]):
            raise HTTPException(status_code=404, detail="Maintenance action not found.")
        vehicle = await self._owned_vehicle(str(plan["vehicle_id"]), user_id)
        if action.get("user_id") != user_id or action.get("vehicle_id") != str(vehicle["_id"]):
            raise HTTPException(status_code=404, detail="Maintenance action not found.")
        return plan, vehicle, action

    def _response(self, document: dict, vehicle: dict):
        data = serialize_document(document)
        current_mileage = vehicle["current_mileage"]
        today = self.clock().date()
        for action in data.get("actions", []):
            reminder = action.get("reminder") or {}
            active = reminder.get("enabled") and reminder.get("status", ReminderStatus.ACTIVE.value) == ReminderStatus.ACTIVE.value
            reasons = []
            target_date = _as_date(action.get("scheduled_date") or action.get("target_date"))
            if active and target_date is not None and reminder.get("advance_days") is not None:
                if target_date <= today + timedelta(days=reminder["advance_days"]):
                    reasons.append("date")
            target_mileage = action.get("target_mileage")
            if active and target_mileage is not None and reminder.get("advance_km") is not None:
                if current_mileage >= target_mileage - reminder["advance_km"]:
                    reasons.append("mileage")
            action["reminder_due"] = bool(reasons) and action.get("status") not in {
                ActionStatus.COMPLETED.value, ActionStatus.CANCELLED.value,
                ActionStatus.SKIPPED.value, ActionStatus.REJECTED.value,
            }
            action["reminder_reason"] = " and ".join(reasons) if reasons else None
        return MaintenancePlan.model_validate(data)

    def _base_action(self, plan: dict, user_id: str, now: datetime, event_key: str):
        action_id = str(uuid4())
        return {
            "id": action_id,
            "user_id": user_id,
            "vehicle_id": str(plan["vehicle_id"]),
            "plan_id": str(plan["_id"]),
            "event_key": event_key,
            "maintenance_type": None,
            "category": "General maintenance",
            "component": "General maintenance",
            "title": "Maintenance action",
            "description": None,
            "action_type": ActionType.USER_CREATED.value,
            "recommendation_source": ActionSource.USER.value,
            "source_references": [],
            "priority": ActionPriority.NORMAL.value,
            "status": ActionStatus.PROPOSED.value,
            "trigger_basis": TriggerBasis.UNKNOWN.value,
            "target_mileage": None,
            "target_date": None,
            "target_date_estimated": False,
            "source_due_mileage": None,
            "source_due_date": None,
            "scheduled_date": None,
            "completion_date": None,
            "completion_mileage": None,
            "work_performed": None,
            "service_provider": None,
            "estimated_cost": None,
            "actual_cost": None,
            "notes": None,
            "skip_reason": None,
            "component_replaced": False,
            "service_visit_id": None,
            "status_history": [{"status": ActionStatus.PROPOSED.value, "changed_at": now, "reason": "Awaiting owner review."}],
            "reminder": ReminderSettings().model_dump(mode="python"),
            "created_at": now,
            "updated_at": now,
        }

    @staticmethod
    def _trigger_basis(due_date, due_mileage):
        if due_date is not None and due_mileage is not None:
            return TriggerBasis.BOTH
        if due_date is not None:
            return TriggerBasis.DATE
        if due_mileage is not None:
            return TriggerBasis.MILEAGE
        return TriggerBasis.UNKNOWN

    @staticmethod
    def _schedule_event_key(maintenance_type, due_date, due_mileage):
        date_key = _as_date(due_date).isoformat() if due_date is not None else "-"
        return f"schedule:{maintenance_type}:{date_key}:{due_mileage if due_mileage is not None else '-'}"

    @staticmethod
    def _event(next_status: str, changed_at: datetime, reason: str | None):
        return {"status": next_status, "changed_at": changed_at, "reason": reason}

    @staticmethod
    def _assert_open_action(action: dict):
        if action.get("status") in {ActionStatus.COMPLETED.value, ActionStatus.CANCELLED.value, ActionStatus.REJECTED.value, ActionStatus.SKIPPED.value}:
            raise HTTPException(status_code=409, detail="This action is no longer active.")

    @staticmethod
    def _add_months(value: date, months: int):
        month_index = value.month - 1 + months
        year = value.year + month_index // 12
        month = month_index % 12 + 1
        next_month = date(year + (month == 12), month % 12 + 1 if month < 12 else 1, 1)
        last_day = (next_month - timedelta(days=1)).day
        return date(year, month, min(value.day, last_day))
