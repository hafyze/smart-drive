import assert from "node:assert/strict";
import test from "node:test";

import { getPredictiveMaintenancePath, readCachedPredictiveResponse } from "../src/features/maintenance/api/predictiveMaintenanceRequest.ts";

test("predictive research paths encode the selected vehicle", () => {
    assert.equal(getPredictiveMaintenancePath("abc/123"), "/ai/predictive-maintenance/abc%2F123");
    assert.equal(getPredictiveMaintenancePath("abc/123", true), "/ai/predictive-maintenance/abc%2F123/cached");
});

test("cached predictive research distinguishes a 204 miss from a report", () => {
    const report = { vehicle_id: "vehicle-1", overview: { high_priority_count: 1 } } as never;
    assert.equal(readCachedPredictiveResponse(204, undefined), null);
    assert.equal(readCachedPredictiveResponse(200, report), report);
});
