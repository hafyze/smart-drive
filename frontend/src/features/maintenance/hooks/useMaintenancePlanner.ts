import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { maintenancePlannerApi } from "../api/maintenancePlannerApi";
import type { MaintenancePlan } from "../types/maintenancePlan";

export const maintenancePlansKey = (vehicleId: string) => ["maintenance-plans", vehicleId] as const;

export function useMaintenancePlans(vehicleId: string) {
    return useQuery({
        queryKey: maintenancePlansKey(vehicleId),
        queryFn: () => maintenancePlannerApi.list(vehicleId),
        enabled: Boolean(vehicleId),
    });
}

export function useMaintenancePlannerMutation(vehicleId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (operation: () => Promise<MaintenancePlan>) => operation(),
        onSuccess: (updatedPlan) => {
            queryClient.setQueryData<MaintenancePlan[]>(maintenancePlansKey(vehicleId), (current) => {
                const plans = current ?? [];
                const exists = plans.some((plan) => plan.id === updatedPlan.id);
                const next = exists
                    ? plans.map((plan) => plan.id === updatedPlan.id ? updatedPlan : plan)
                    : [updatedPlan, ...plans];
                return next.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
            });
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            queryClient.invalidateQueries({ queryKey: ["maintenance"] });
            queryClient.invalidateQueries({ queryKey: ["service-history"] });
        },
    });
}
