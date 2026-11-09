import assert from "node:assert/strict";
import test from "node:test";

import type { ServiceVisit } from "../src/features/maintenance/types/maintenance.ts";
import { calculateAreas, calculateOverallScore } from "../src/features/maintenance/utils/maintenanceScore.ts";

const vehicle = { current_mileage: 10_000 };
function visit(id: string, type: "ENGINE_OIL" | "TRANSMISSION", nextDueMileage: number | null): ServiceVisit {
    return {
        id, user_id: "owner", vehicle_id: "vehicle", service_date: "2026-01-01",
        mileage_at_service: 9_000, workshop: null, notes: null,
        created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
        items: [{ id: `${id}-item`, type, description: null, next_due_date: null,
            next_due_mileage: nextDueMileage, cost: null, notes: null,
            status: "COMPLETED", schedule_status: "UPCOMING" }],
    };
}

test("maintenance score keeps the existing due-soon, overdue, and averaging rules", () => {
    const areas = calculateAreas(vehicle, [
        visit("engine", "ENGINE_OIL", 10_000),
        visit("transmission", "TRANSMISSION", 11_000),
    ]);
    assert.equal(areas.find((area) => area.name === "Engine")?.score, 70);
    assert.equal(areas.find((area) => area.name === "Transmission")?.score, 70);
    assert.deepEqual(calculateOverallScore(areas), { eligibleCount: 2, score: 70 });

    const overdueAreas = calculateAreas(vehicle, [
        visit("engine-overdue", "ENGINE_OIL", 9_999),
        visit("transmission-soon", "TRANSMISSION", 11_000),
    ]);
    assert.deepEqual(calculateOverallScore(overdueAreas), { eligibleCount: 2, score: 50 });
});

test("maintenance score excludes missing schedules and requires two usable areas", () => {
    const areas = calculateAreas(vehicle, [visit("engine", "ENGINE_OIL", 20_000)]);
    assert.equal(areas.find((area) => area.name === "Engine")?.score, 100);
    assert.equal(areas.find((area) => area.name === "Transmission")?.score, null);
    assert.deepEqual(calculateOverallScore(areas), { eligibleCount: 1, score: null });
});
