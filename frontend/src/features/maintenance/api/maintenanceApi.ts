import api from "@/shared/api/axios";

import type {
    CreateServiceVisitPayload,
    DeleteMaintenanceResponse,
    ServiceVisit,
    UpdateServiceVisitPayload,
} from "../types/maintenance";

export const maintenanceApi = {
    // ============================================================
    // Get all service visits for a vehicle
    // ============================================================

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

    // ============================================================
    // Get a single service visit
    // ============================================================

    getById: async (
        serviceVisitId: string,
    ): Promise<ServiceVisit> => {
        const response = await api.get<ServiceVisit>(
            `/maintenance/${serviceVisitId}`,
        );

        return response.data;
    },

    // ============================================================
    // Create a complete service visit
    // ============================================================

    createServiceVisit: async (
        serviceVisit: CreateServiceVisitPayload,
    ): Promise<ServiceVisit> => {
        const response = await api.post<ServiceVisit>(
            "/maintenance",
            serviceVisit,
        );

        return response.data;
    },

    // ============================================================
    // Update a complete service visit
    // ============================================================

    updateServiceVisit: async (
        serviceVisitId: string,
        serviceVisit: UpdateServiceVisitPayload,
    ): Promise<ServiceVisit> => {
        try {
            const response = await api.put<ServiceVisit>(
                `/maintenance/${serviceVisitId}`,
                serviceVisit,
            );

            return response.data;
        } catch (error: any) {
            console.error(
                "UPDATE SERVICE VISIT ERROR:",
                error.response?.data ?? error,
            );

            throw error;
        }
    },

    // ============================================================
    // Delete a service visit
    // ============================================================

    delete: async (
        serviceVisitId: string,
    ): Promise<DeleteMaintenanceResponse> => {
        const response =
            await api.delete<DeleteMaintenanceResponse>(
                `/maintenance/${serviceVisitId}`,
            );

        return response.data;
    },
};