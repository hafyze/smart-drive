import type { ConversationSummary } from "../types/maintenanceConversation";

export function getVehicleConversationPath(vehicleId: string, conversationId?: string): string {
    const base = `/ai/vehicles/${encodeURIComponent(vehicleId)}/conversations`;
    return conversationId ? `${base}/${encodeURIComponent(conversationId)}` : base;
}

export function resolveConversationSelection(
    requestedId: string | null,
    conversations: ConversationSummary[],
): string | null {
    if (requestedId && conversations.some((conversation) => conversation.id === requestedId)) return requestedId;
    return conversations[0]?.id ?? null;
}

export function updateConversationSearchParams(current: URLSearchParams, conversationId: string): URLSearchParams {
    const next = new URLSearchParams(current);
    if (conversationId) next.set("conversationId", conversationId);
    else next.delete("conversationId");
    return next;
}
