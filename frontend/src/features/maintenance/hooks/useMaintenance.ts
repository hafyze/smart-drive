import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { maintenanceApi } from "../api/maintenanceApi";

import type {
    CreateServiceVisitPayload,
    UpdateServiceVisitPayload,
} from "../types/maintenance";

const MAINTENANCE_QUERY_KEY = ["maintenance"] as const;
const SERVICE_HISTORY_QUERY_KEY = ["service-history"] as const;


// ============================================================
// Get Maintenance / Service Visits
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
// Get Single Service Visit
// ============================================================

export const useMaintenanceRecord = (
    serviceVisitId: string,
) => {
    return useQuery({
        queryKey: [
            ...MAINTENANCE_QUERY_KEY,
            "record",
            serviceVisitId,
        ],
        queryFn: () =>
            maintenanceApi.getById(serviceVisitId),
        enabled: Boolean(serviceVisitId),
    });
};


// ============================================================
// Get All Maintenance / Service Visits
// ============================================================

export const useAllMaintenance = () => {
    return useQuery({
        queryKey: MAINTENANCE_QUERY_KEY,
        queryFn: () => maintenanceApi.getAll(),
    });
};


// ============================================================
// Get Single Service Visit
// ============================================================

export const useServiceVisit = (
    serviceVisitId: string,
) => {
    return useQuery({
        queryKey: [
            ...MAINTENANCE_QUERY_KEY,
            "visit",
            serviceVisitId,
        ],
        queryFn: () =>
            maintenanceApi.getById(serviceVisitId),
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
        ) =>
            maintenanceApi.createServiceVisit(
                serviceVisit,
            ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });

            queryClient.invalidateQueries({
                queryKey: SERVICE_HISTORY_QUERY_KEY,
            });
        },
    });
};


// ============================================================
// Update Service Visit
// ============================================================
//
// Updates the complete service visit.
//
// The backend endpoint is:
//
// PUT /maintenance/{service_visit_id}
//
// ============================================================

export const useUpdateServiceVisit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            serviceVisitId,
            serviceVisit,
        }: {
            serviceVisitId: string;
            serviceVisit: UpdateServiceVisitPayload;
        }) =>
            maintenanceApi.updateServiceVisit(
                serviceVisitId,
                serviceVisit,
            ),

        onSuccess: (_, variables) => {
            // Refresh maintenance list
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });

            // Refresh this specific service visit
            queryClient.invalidateQueries({
                queryKey: [
                    ...MAINTENANCE_QUERY_KEY,
                    "record",
                    variables.serviceVisitId,
                ],
            });

            // Refresh service visit query
            queryClient.invalidateQueries({
                queryKey: [
                    ...MAINTENANCE_QUERY_KEY,
                    "visit",
                    variables.serviceVisitId,
                ],
            });

            // Refresh service history
            queryClient.invalidateQueries({
                queryKey: SERVICE_HISTORY_QUERY_KEY,
            });
        },
    });
};


// ============================================================
// Delete Service Visit
// ============================================================

export const useDeleteMaintenance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            serviceVisitId: string,
        ) =>
            maintenanceApi.delete(
                serviceVisitId,
            ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: MAINTENANCE_QUERY_KEY,
            });

            queryClient.invalidateQueries({
                queryKey: SERVICE_HISTORY_QUERY_KEY,
            });
        },
    });
};