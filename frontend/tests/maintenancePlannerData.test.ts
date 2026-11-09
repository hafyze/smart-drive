import assert from "node:assert/strict";
import test from "node:test";

import type { MaintenancePlanAction } from "../src/features/maintenance/types/maintenancePlan.ts";
import { getActionCalendarDate, getActionsForMonth, getMonthCalendarDays, getPlannerCounts } from "../src/features/maintenance/utils/maintenancePlannerData.ts";

function action(overrides: Partial<MaintenancePlanAction>): MaintenancePlanAction {
    return {
        id: "action", user_id: "user", vehicle_id: "vehicle", plan_id: "plan", event_key: "key",
        maintenance_type: null, category: "Engine", component: "Engine", title: "Service",
        description: null, action_type: "USER_CREATED", recommendation_source: "USER",
        source_references: [], priority: "NORMAL", status: "PLANNED", trigger_basis: "UNKNOWN",
        target_mileage: null, target_date: null, target_date_estimated: false,
        source_due_mileage: null, source_due_date: null, scheduled_date: null,
        completion_date: null, completion_mileage: null, work_performed: null,
        service_provider: null, estimated_cost: null, actual_cost: null, notes: null,
        skip_reason: null, component_replaced: false, service_visit_id: null,
        status_history: [], reminder: { enabled: false, advance_days: null, advance_km: null, status: "ACTIVE", history: [] },
        reminder_due: false, reminder_reason: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

test("planner counts approved actions by the earliest date or mileage trigger", () => {
    const actions = [
        action({ id: "overdue-date", target_date: "2026-11-08" }),
        action({ id: "overdue-mileage", target_mileage: 20_000 }),
        action({ id: "due-today", target_date: "2026-11-09" }),
        action({ id: "proposed", status: "PROPOSED", target_date: "2026-11-01" }),
        action({ id: "done", status: "COMPLETED" }),
    ];
    assert.deepEqual(getPlannerCounts(actions, 20_000, "2026-11-09"), { proposed: 1, overdue: 2, upcoming: 1, completed: 1 });
});

test("calendar prefers completion, then scheduled and target dates", () => {
    assert.equal(getActionCalendarDate(action({ target_date: "2026-01-02", scheduled_date: "2026-01-03" })), "2026-01-03");
    assert.equal(getActionCalendarDate(action({ target_date: "2026-01-02", completion_date: "2026-01-04" })), "2026-01-04");
    assert.equal(getActionsForMonth([action({ target_date: "2026-01-02" }), action({ target_date: "2026-02-01" })], "2026-01").length, 1);
});

test("monthly calendar returns a complete week grid without fake dates", () => {
    const days = getMonthCalendarDays("2026-02");
    assert.equal(days.length % 7, 0);
    assert.equal(days.filter((item) => item.date !== null).length, 28);
    assert.equal(days[0].date, "2026-02-01");
});
