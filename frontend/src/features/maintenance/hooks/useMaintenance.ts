import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { maintenanceApi } from "../api/maintenanceApi";

import type {
    CreateServiceVisitPayload,
    UpdateMaintenancePayload,
} from "../types/maintenance";

const MAINTENANCE_QUERY_KEY = ["maintenance"] as const;
const SERVICE_HISTORY_QUERY_KEY = ["service-history"] as const;


// ============================================================
// Get Maintenance
// ============================================================

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


// ============================================================
// Get Single Maintenance Record
// ============================================================

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


// ============================================================
// Get All Maintenance
// ============================================================

export const useAllMaintenance = () => {
    return useQuery({
        queryKey: MAINTENANCE_QUERY_KEY,
        queryFn: () => maintenanceApi.getAll(),
    });
};

export const useServiceVisit = (
    serviceVisitId: string,
) => {
    return useQuery({
        queryKey: [
            ...MAINTENANCE_QUERY_KEY,
            "visit",
            serviceVisitId,
        ],
        queryFn: () => maintenanceApi.getById(serviceVisitId),
        enabled: Boolean(serviceVisitId),
    });
};

// ============================================================
// Create Service Visit
// ============================================================
//
// A service visit can contain multiple maintenance items.
//
// Example:
//
// Service Visit
// ├── Engine Oil
// ├── Oil Filter
// └── Air Filter
//
// ============================================================

export const useCreateServiceVisit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            serviceVisit: CreateServiceVisitPayload,
        ) => maintenanceApi.createServiceVisit(serviceVisit),

        onSuccess: () => {
            // Refresh maintenance data
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });

            // Refresh service history timeline
            queryClient.invalidateQueries({
                queryKey: SERVICE_HISTORY_QUERY_KEY,
            });
        },
    });
};


// ============================================================
// Update Maintenance Item
// ============================================================

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
            // Refresh maintenance lists
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });

            // Refresh individual record
            queryClient.invalidateQueries({
                queryKey: [
                    ...MAINTENANCE_QUERY_KEY,
                    "record",
                    variables.maintenanceId,
                ],
            });

            // Service history may also have changed
            queryClient.invalidateQueries({
                queryKey: SERVICE_HISTORY_QUERY_KEY,
            });
        },
    });
};


// ============================================================
// Delete Maintenance Item
// ============================================================

export const useDeleteMaintenance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            maintenanceId: string,
        ) => maintenanceApi.delete(maintenanceId),

        onSuccess: () => {
            // Refresh maintenance lists
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });

            // Refresh service history
            queryClient.invalidateQueries({
                queryKey: SERVICE_HISTORY_QUERY_KEY,
            });
        },
    });
};