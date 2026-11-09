import type { PredictiveMaintenanceReport } from "../types/predictiveMaintenance";

export function getPredictiveMaintenancePath(vehicleId: string, cachedOnly = false): string {
    const path = `/ai/predictive-maintenance/${encodeURIComponent(vehicleId)}`;
    return cachedOnly ? `${path}/cached` : path;
}

export function readCachedPredictiveResponse(
    status: number,
    data: PredictiveMaintenanceReport | null | undefined,
): PredictiveMaintenanceReport | null {
    return status === 204 ? null : data ?? null;
}
