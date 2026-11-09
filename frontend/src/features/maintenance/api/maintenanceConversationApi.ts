import api from "@/shared/api/axios";
import type { ConversationDetail, ConversationSummary, ConversationTurn } from "../types/maintenanceConversation";
import { getVehicleConversationPath } from "./conversationRequest";

export const maintenanceConversationApi = {
    list: async (vehicleId: string): Promise<ConversationSummary[]> => {
        const response = await api.get<ConversationSummary[]>(getVehicleConversationPath(vehicleId));
        return response.data;
    },
    create: async (vehicleId: string): Promise<ConversationSummary> => {
        const response = await api.post<ConversationSummary>(getVehicleConversationPath(vehicleId), {});
        return response.data;
    },
    get: async (vehicleId: string, conversationId: string): Promise<ConversationDetail> => {
        const response = await api.get<ConversationDetail>(getVehicleConversationPath(vehicleId, conversationId));
        return response.data;
    },
    delete: async (vehicleId: string, conversationId: string): Promise<void> => {
        await api.delete(getVehicleConversationPath(vehicleId, conversationId));
    },
    send: async (vehicleId: string, conversationId: string, clientMessageId: string, content: string): Promise<ConversationTurn> => {
        const response = await api.post<ConversationTurn>(
            `${getVehicleConversationPath(vehicleId, conversationId)}/messages`,
            { client_message_id: clientMessageId, content },
            { timeout: 120_000 },
        );
        return response.data;
    },
};
