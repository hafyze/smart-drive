import api from "@/shared/api/axios";
import type { PredictiveMaintenanceReport } from "../types/predictiveMaintenance";
import { getPredictiveMaintenancePath, readCachedPredictiveResponse } from "./predictiveMaintenanceRequest";

export const predictiveMaintenanceApi = {
    getCached: async (vehicleId: string, signal?: AbortSignal): Promise<PredictiveMaintenanceReport | null> => {
        const response = await api.get<PredictiveMaintenanceReport | null>(
            getPredictiveMaintenancePath(vehicleId, true),
            { signal, timeout: 15_000, validateStatus: (status) => status === 200 || status === 204 },
        );
        return readCachedPredictiveResponse(response.status, response.data);
    },
    research: async (vehicleId: string, refresh: boolean, signal?: AbortSignal): Promise<PredictiveMaintenanceReport> => {
        const response = await api.post<PredictiveMaintenanceReport>(
            getPredictiveMaintenancePath(vehicleId),
            { refresh },
            { signal, timeout: 120_000 },
        );
        return response.data;
    },
};
