import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { vehicleApi } from "../api/vehicleApi";
import type {
    VehicleCreate,
    VehicleUpdate
} from "../types/vehicle";

const VEHICLES_QUERY_KEY = ["vehicles"] as const;

export const useVehicles = () => {
    return useQuery({
        queryKey: VEHICLES_QUERY_KEY,
        queryFn: vehicleApi.getAll,
    });
};

export const useVehicle = (vehicleId: string) => {
    return useQuery({
        queryKey: [...VEHICLES_QUERY_KEY, vehicleId],
        queryFn: () => vehicleApi.getById(vehicleId),
        enabled: Boolean(vehicleId),
    });
};

export const useCreateVehicle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (vehicle: VehicleCreate) => 
            vehicleApi.create(vehicle),
        
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: VEHICLES_QUERY_KEY,
            });
        },
    });
};

export const useUpdateVehicle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            vehicleId,
            vehicle,
        }: {
            vehicleId: string;
            vehicle: VehicleUpdate;
        }) => vehicleApi.update(vehicleId, vehicle),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: VEHICLES_QUERY_KEY,
            });
            
            queryClient.invalidateQueries({
                queryKey: [...VEHICLES_QUERY_KEY, variables.vehicleId]
            });
        },
    });
};

export const useDeleteVehicle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (vehicleId: string) =>
            vehicleApi.delete(vehicleId),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: VEHICLES_QUERY_KEY,
            });
        },
    });
};