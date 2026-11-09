import assert from "node:assert/strict";
import test from "node:test";

import type { VehicleListItem } from "../src/features/garage/types/vehicle.ts";
import type { ServiceVisit } from "../src/features/maintenance/types/maintenance.ts";
import { getDashboardMaintenanceRecords, getDashboardStatistics, getMaintenanceDistribution, sortOverdueMaintenance, sortUpcomingMaintenance } from "../src/features/dashboard/utils/dashboardData.ts";

const vehicle: VehicleListItem = { id: "v1", nickname: "Daily", manufacturer: "Perodua", model: "Myvi", variant: "AV", year: 2023, current_mileage: 32_000, status: "ACTIVE", photo_url: null };
function visit(id: string, service_date: string, mileage: number, itemType: "ENGINE_OIL" | "TYRE", dueMileage: number | null): ServiceVisit {
    return { id, user_id: "u1", vehicle_id: "v1", service_date, mileage_at_service: mileage, workshop: null, notes: null, created_at: `${service_date}T00:00:00Z`, updated_at: `${service_date}T00:00:00Z`, items: [{ id: `${id}-item`, type: itemType, description: null, next_due_date: null, next_due_mileage: dueMileage, cost: null, notes: null, status: "COMPLETED", schedule_status: dueMileage !== null && dueMileage < vehicle.current_mileage ? "OVERDUE" : dueMileage === null ? null : "UPCOMING" }] };
}

test("dashboard counts distinct visits and only current garage vehicles", () => {
    const visits = [visit("old", "2026-01-01", 20_000, "ENGINE_OIL", 30_000), visit("new", "2026-02-01", 30_000, "ENGINE_OIL", 40_000), { ...visit("deleted-car", "2026-03-01", 1_000, "TYRE", 5_000), vehicle_id: "removed" }];
    assert.deepEqual(getDashboardStatistics([vehicle], [...visits, visits[1]!]), { vehicleCount: 1, serviceRecordCount: 2, upcomingCount: 1, overdueCount: 0 });
    const latest = getDashboardMaintenanceRecords([vehicle], visits);
    assert.equal(latest.length, 1);
    assert.equal(latest[0]?.visit.id, "new");
});

test("distribution separates no schedule and due-soon from up-to-date", () => {
    const records = getDashboardMaintenanceRecords([vehicle], [visit("due-soon", "2026-02-01", 31_000, "ENGINE_OIL", 32_500), visit("no-schedule", "2026-03-01", 31_500, "TYRE", null)]);
    assert.deepEqual(getMaintenanceDistribution(records), { UP_TO_DATE: 0, DUE_SOON: 1, OVERDUE: 0, NO_DATA: 1 });
});

test("schedule lists sort upcoming by nearest due and overdue by severity", () => {
    const near = visit("near", "2026-02-01", 30_000, "ENGINE_OIL", 32_500);
    const far = visit("far", "2026-03-01", 31_000, "TYRE", 35_000);
    const overdueLess = visit("overdue-less", "2026-02-01", 30_000, "ENGINE_OIL", 31_000);
    const overdueMore = visit("overdue-more", "2026-03-01", 31_000, "TYRE", 20_000);
    const upcoming = getDashboardMaintenanceRecords([vehicle], [far, near]);
    const overdue = getDashboardMaintenanceRecords([vehicle], [overdueLess, overdueMore]);
    assert.equal(sortUpcomingMaintenance(upcoming)[0]?.visit.id, "near");
    assert.equal(sortOverdueMaintenance(overdue)[0]?.visit.id, "overdue-more");
});
