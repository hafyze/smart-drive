import api from "@/shared/api/axios";

import type {
    DeleteVehicleResponse,
    VehicleCreate,
    VehicleListItem,
    VehicleResponse,
    VehicleUpdate
} from "../types/vehicle";

export const vehicleApi = {
    getAll: async (): Promise<VehicleListItem[]> => {
        const response = await api.get<VehicleListItem[]>("/vehicles");

        return response.data;
    },

    getById: async (vehicleId: string): Promise<VehicleResponse> => {
        const response = await api.get<VehicleResponse>(
            `/vehicles/${vehicleId}`,
        );

        return response.data
    },

    create: async (vehicle: VehicleCreate): Promise<VehicleResponse> => {
        const response = await api.post<VehicleResponse>(
            `/vehicles`,
            vehicle,
        )

        return response.data
    },

    update: async (vehicleId: string, vehicle: VehicleUpdate): Promise<VehicleResponse> => {
        const response = await api.put<VehicleResponse>(
            `/vehicles/${vehicleId}`,
            vehicle,
        );

        return response.data
    },

    delete: async (vehicleId: string): Promise<DeleteVehicleResponse> => {
        const response = await api.delete<DeleteVehicleResponse>(
            `/vehicles/${vehicleId}`,
        );

        return response.data
    }
}