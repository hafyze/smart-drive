import assert from "node:assert/strict";
import test from "node:test";

import { filterGarageVehicles, getGarageStatistics } from "../src/features/garage/utils/garageData.ts";
import type { ServiceVisit } from "../src/features/maintenance/types/maintenance.ts";
import type { VehicleListItem } from "../src/features/garage/types/vehicle.ts";

const vehicles: VehicleListItem[] = [
    {
        id: "vehicle-1",
        nickname: "Daily",
        manufacturer: "Perodua",
        model: "Myvi",
        variant: "1.5 AV",
        year: 2023,
        current_mileage: 33_000,
        status: "ACTIVE",
        photo_url: null,
        plate_number: "VAB 1234",
    },
];

const visits: ServiceVisit[] = [
    {
        id: "visit-1",
        user_id: "owner-1",
        vehicle_id: "vehicle-1",
        service_date: "2026-10-01",
        mileage_at_service: 30_000,
        workshop: "Workshop",
        notes: null,
        items: [
            { id: "oil", type: "ENGINE_OIL", description: null, next_due_date: null, next_due_mileage: 40_000, cost: 100, notes: null, status: "COMPLETED", schedule_status: "UPCOMING" },
            { id: "tyre", type: "TYRE", description: null, next_due_date: null, next_due_mileage: null, cost: null, notes: null, status: "COMPLETED", schedule_status: null },
        ],
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
    },
    {
        id: "visit-removed-car",
        user_id: "owner-1",
        vehicle_id: "soft-deleted-vehicle",
        service_date: "2026-09-01",
        mileage_at_service: 10_000,
        workshop: null,
        notes: null,
        items: [{ id: "other-oil", type: "ENGINE_OIL", description: null, next_due_date: null, next_due_mileage: 20_000, cost: 100, notes: null, status: "COMPLETED", schedule_status: "UPCOMING" }],
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
    },
];

test("garage metrics count visits and upcoming schedules only for current garage vehicles", () => {
    assert.deepEqual(getGarageStatistics(vehicles, [...visits, visits[0]!]), {
        vehicleCount: 1,
        serviceRecordCount: 1,
        upcomingServiceCount: 1,
    });
    assert.equal(getGarageStatistics(undefined, visits).serviceRecordCount, null);
    assert.equal(getGarageStatistics(vehicles, undefined).upcomingServiceCount, null);
});

test("garage search matches nickname, make, model, variant, and plate", () => {
    for (const query of ["daily", "perodua", "MYVI", "1.5 av", "vab 1234", "VAB1234"]) {
        assert.deepEqual(filterGarageVehicles(vehicles, query), vehicles);
    }
    assert.deepEqual(filterGarageVehicles(vehicles, "not found"), []);
    assert.deepEqual(filterGarageVehicles(vehicles, "  "), vehicles);
});
