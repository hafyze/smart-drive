import assert from "node:assert/strict";
import test from "node:test";

import { getMaintenanceResearchPath, readCachedResearchResponse } from "../src/features/maintenance/api/researchRequest.ts";

test("research requests encode and target the selected vehicle", () => {
    assert.equal(getMaintenanceResearchPath("abc/123"), "/ai/research/abc%2F123");
    assert.equal(getMaintenanceResearchPath("abc/123", true), "/ai/research/abc%2F123/cached");
});

test("cache-only response treats 204 as a cache miss and returns cached profiles", () => {
    const profile = { manufacturer: "Perodua", model: "Myvi" };
    assert.equal(readCachedResearchResponse(204, undefined), null);
    assert.deepEqual(readCachedResearchResponse(200, profile), profile);
});
