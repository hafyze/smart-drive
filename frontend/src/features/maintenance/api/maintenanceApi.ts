import api from "@/shared/api/axios";

import type {
    CreateServiceVisitPayload,
    DeleteMaintenanceResponse,
    Maintenance,
    ServiceVisit,
    UpdateMaintenancePayload,
} from "../types/maintenance";

export const maintenanceApi = {
    // Get all service visits for a vehicle
    getAll: async (
        vehicleId?: string,
    ): Promise<ServiceVisit[]> => {
        const response = await api.get<ServiceVisit[]>(
            "/maintenance",
            {
                params: vehicleId
                    ? { vehicle_id: vehicleId }
                    : undefined,
            },
        );

        return response.data;
    },

    // Get a single maintenance item
    getById: async (
        maintenanceId: string,
    ): Promise<Maintenance> => {
        const response = await api.get<Maintenance>(
            `/maintenance/${maintenanceId}`,
        );

        return response.data;
    },

    // Create a complete service visit
    createServiceVisit: async (
        serviceVisit: CreateServiceVisitPayload,
    ): Promise<ServiceVisit> => {
        const response = await api.post<ServiceVisit>(
            "/maintenance",
            serviceVisit,
        );

        return response.data;
    },

    // Update an individual maintenance item
    update: async (
        maintenanceId: string,
        maintenance: UpdateMaintenancePayload,
    ): Promise<Maintenance> => {
        try {
            const response = await api.put<Maintenance>(
                `/maintenance/${maintenanceId}`,
                maintenance,
            );

            return response.data;
        } catch (error: any) {
            console.error(
                "UPDATE MAINTENANCE ERROR:",
                error.response?.data ?? error
            );

            throw error;
        }
    },

    // Delete an individual maintenance item
    delete: async (
        maintenanceId: string,
    ): Promise<DeleteMaintenanceResponse> => {
        const response = await api.delete<DeleteMaintenanceResponse>(
            `/maintenance/${maintenanceId}`,
        );

        return response.data;
    },
};