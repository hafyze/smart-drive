import api from "@/shared/api/axios";
import type { MaintenanceKnowledgeProfile } from "../types/maintenanceResearch";
import { getMaintenanceResearchPath, readCachedResearchResponse } from "./researchRequest";

export const maintenanceResearchApi = {
    getCached: async (vehicleId: string, signal?: AbortSignal): Promise<MaintenanceKnowledgeProfile | null> => {
        const response = await api.get<MaintenanceKnowledgeProfile | null>(
            getMaintenanceResearchPath(vehicleId, true),
            { signal, timeout: 15_000, validateStatus: (status) => status === 200 || status === 204 },
        );
        return readCachedResearchResponse(response.status, response.data);
    },
    research: async (vehicleId: string, signal?: AbortSignal): Promise<MaintenanceKnowledgeProfile> => {
        const response = await api.post<MaintenanceKnowledgeProfile>(
            getMaintenanceResearchPath(vehicleId),
            {},
            { signal, timeout: 120_000 },
        );
        return response.data;
    },
};
