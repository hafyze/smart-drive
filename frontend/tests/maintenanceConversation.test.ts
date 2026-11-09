import test from "node:test";
import assert from "node:assert/strict";

import { getVehicleConversationPath, resolveConversationSelection, updateConversationSearchParams } from "../src/features/maintenance/api/conversationRequest.ts";
import type { ConversationSummary } from "../src/features/maintenance/types/maintenanceConversation.ts";

const conversations: ConversationSummary[] = [
    { id: "newer", vehicle_id: "vehicle-a", title: "Recent", created_at: "", updated_at: "", expires_at: "", turn_count: 2 },
    { id: "older", vehicle_id: "vehicle-a", title: "Prior", created_at: "", updated_at: "", expires_at: "", turn_count: 1 },
];

test("conversation API paths keep the selected vehicle and encode identifiers", () => {
    assert.equal(getVehicleConversationPath("vehicle / one"), "/ai/vehicles/vehicle%20%2F%20one/conversations");
    assert.equal(getVehicleConversationPath("vehicle-a", "chat/one"), "/ai/vehicles/vehicle-a/conversations/chat%2Fone");
});

test("conversation selection restores the requested chat and falls back to the latest vehicle chat", () => {
    assert.equal(resolveConversationSelection("older", conversations), "older");
    assert.equal(resolveConversationSelection("from-another-vehicle", conversations), "newer");
    assert.equal(resolveConversationSelection(null, []), null);
});

test("conversation selection is stored in the vehicle URL without dropping other page state", () => {
    const current = new URLSearchParams("tab=insights&vehicleId=vehicle-a");
    const selected = updateConversationSearchParams(current, "chat-1");
    assert.equal(selected.get("tab"), "insights");
    assert.equal(selected.get("vehicleId"), "vehicle-a");
    assert.equal(selected.get("conversationId"), "chat-1");
    assert.equal(updateConversationSearchParams(selected, "").has("conversationId"), false);
});
