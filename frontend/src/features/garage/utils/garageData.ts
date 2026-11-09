import type { ServiceVisit } from "@/features/maintenance/types/maintenance";
import type { VehicleListItem } from "../types/vehicle";

export interface GarageStatistics {
    vehicleCount: number | null;
    serviceRecordCount: number | null;
    upcomingServiceCount: number | null;
}

/**
 * Service records are visit documents for vehicles still in the user's garage.
 * Upcoming services are individual saved maintenance items whose computed
 * schedule status is UPCOMING; completed/cancelled items are not inferred.
 */
export function getGarageStatistics(
    vehicles: VehicleListItem[] | undefined,
    visits: ServiceVisit[] | undefined,
): GarageStatistics {
    const vehicleCount = vehicles?.length ?? null;
    if (!vehicles || !visits) {
        return {
            vehicleCount,
            serviceRecordCount: null,
            upcomingServiceCount: null,
        };
    }

    const garageVehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
    const uniqueVisits = new Map(
        visits
            .filter((visit) => garageVehicleIds.has(visit.vehicle_id))
            .map((visit) => [visit.id, visit]),
    );
    const ownedVisits = [...uniqueVisits.values()];
    const upcomingItemKeys = new Set<string>();

    for (const visit of ownedVisits) {
        for (const item of visit.items) {
            if (item.schedule_status === "UPCOMING") {
                upcomingItemKeys.add(`${visit.id}:${item.id}`);
            }
        }
    }

    return {
        vehicleCount,
        serviceRecordCount: ownedVisits.length,
        upcomingServiceCount: upcomingItemKeys.size,
    };
}

export function filterGarageVehicles(
    vehicles: VehicleListItem[],
    search: string,
): VehicleListItem[] {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return vehicles;
    const compactQuery = query.replace(/[\W_]/g, "");

    return vehicles.filter((vehicle) =>
        [
            vehicle.nickname,
            vehicle.manufacturer,
            vehicle.model,
            vehicle.variant,
            vehicle.plate_number,
        ].some((value) => {
            if (!value) return false;
            const normalizedValue = value.toLocaleLowerCase();
            return normalizedValue.includes(query)
                || normalizedValue.replace(/[\W_]/g, "").includes(compactQuery);
        }),
    );
}
