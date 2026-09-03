import api from "@/shared/api/axios";

import type { ServiceHistoryVisit } from "../types/serviceHistory";

export const serviceHistoryApi = {
    getByVehicle: async (
        vehicleId: string,
    ): Promise<ServiceHistoryVisit[]> => {
        const response = await api.get<ServiceHistoryVisit[]>(
            `/service-history/${vehicleId}`,
        );

        return response.data;
    },
};