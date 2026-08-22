import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { maintenanceApi } from "../api/maintenanceApi";
import type {
    CreateMaintenancePayload,
    UpdateMaintenancePayload,
} from "../types/maintenance";

const MAINTENANCE_QUERY_KEY = ["maintenance"] as const;

export const useMaintenance = (vehicleId?: string) => {
    return useQuery({
        queryKey: [
            ...MAINTENANCE_QUERY_KEY,
            "vehicle",
            vehicleId,
        ],
        queryFn: () => maintenanceApi.getAll(vehicleId),
        enabled: vehicleId !== undefined,
    });
};

export const useMaintenanceRecord = (
    maintenanceId: string,
) => {
    return useQuery({
        queryKey: [
            ...MAINTENANCE_QUERY_KEY,
            "record",
            maintenanceId,
        ],
        queryFn: () => maintenanceApi.getById(maintenanceId),
        enabled: Boolean(maintenanceId),
    });
};

export const useAllMaintenance = () => {
    return useQuery({
        queryKey: MAINTENANCE_QUERY_KEY,
        queryFn: () => maintenanceApi.getAll(),
    });
};

export const useCreateMaintenance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            maintenance: CreateMaintenancePayload,
        ) => maintenanceApi.create(maintenance),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });
        },
    });
};

export const useUpdateMaintenance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            maintenanceId,
            maintenance,
        }: {
            maintenanceId: string;
            maintenance: UpdateMaintenancePayload;
        }) =>
            maintenanceApi.update(
                maintenanceId,
                maintenance,
            ),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });

            queryClient.invalidateQueries({
                queryKey: [
                    ...MAINTENANCE_QUERY_KEY,
                    "record",
                    variables.maintenanceId,
                ],
            });
        },
    });
};

export const useDeleteMaintenance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            maintenanceId: string,
        ) => maintenanceApi.delete(maintenanceId),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });
        },
    });
};