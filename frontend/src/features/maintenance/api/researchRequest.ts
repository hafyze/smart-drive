export function getMaintenanceResearchPath(vehicleId: string, cachedOnly = false): string {
    const path = `/ai/research/${encodeURIComponent(vehicleId)}`;
    return cachedOnly ? `${path}/cached` : path;
}

export function readCachedResearchResponse<T>(status: number, data: T | null | undefined): T | null {
    return status === 204 ? null : data ?? null;
}
