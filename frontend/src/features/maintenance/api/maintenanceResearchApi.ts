import api from "@/shared/api/axios";
import type { MaintenanceKnowledgeProfile } from "../types/maintenanceResearch";

export const maintenanceResearchApi = {
    research: async (vehicleId: string, signal?: AbortSignal): Promise<MaintenanceKnowledgeProfile> => {
        const response = await api.post<MaintenanceKnowledgeProfile>(
            `/ai/research/${vehicleId}`,
            {},
            { signal, timeout: 120_000 },
        );
        return response.data;
    },
};
