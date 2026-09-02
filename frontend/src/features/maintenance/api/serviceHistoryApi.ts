import api from "@/shared/api/axios";


import type { MaintenanceListItem } from "../types/maintenance";

export const serviceHistoryApi = {
    getByVehicle: async (vehicleId: string): Promise<MaintenanceListItem[]> => {
        const response = await api.get<MaintenanceListItem[]>(
            `/service-history/${vehicleId}`,
        );
        return response.data
    }
}