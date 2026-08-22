import api from "@/shared/api/axios";

import type {
    CreateMaintenancePayload,
    DeleteMaintenanceResponse,
    Maintenance,
    MaintenanceListItem,
    UpdateMaintenancePayload,
} from "../types/maintenance";

export const maintenanceApi = {
    getAll: async (
        vehicleId?: string,
    ): Promise<MaintenanceListItem[]> => {
        const response = await api.get<MaintenanceListItem[]>(
            "/maintenance",
            {
                params: vehicleId
                    ? { vehicle_id: vehicleId }
                    : undefined,
            },
        );

        return response.data;
    },

    getById: async (
        maintenanceId: string,
    ): Promise<Maintenance> => {
        const response = await api.get<Maintenance>(
            `/maintenance/${maintenanceId}`,
        );

        return response.data;
    },

    create: async (
        maintenance: CreateMaintenancePayload,
    ): Promise<Maintenance> => {
        const response = await api.post<Maintenance>(
            "/maintenance",
            maintenance,
        );

        return response.data;
    },

    update: async (
        maintenanceId: string,
        maintenance: UpdateMaintenancePayload,
    ): Promise<Maintenance> => {
        const response = await api.put<Maintenance>(
            `/maintenance/${maintenanceId}`,
            maintenance,
        );

        return response.data;
    },

    delete: async (
        maintenanceId: string,
    ): Promise<DeleteMaintenanceResponse> => {
        const response = await api.delete<DeleteMaintenanceResponse>(
            `/maintenance/${maintenanceId}`,
        );

        return response.data;
    },
};