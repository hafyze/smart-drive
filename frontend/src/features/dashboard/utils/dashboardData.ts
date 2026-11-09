import type { VehicleListItem } from "@/features/garage/types/vehicle";
import type { MaintenanceType, ServiceVisit } from "@/features/maintenance/types/maintenance";
import {
    getLatestMaintenanceRecords,
    isScheduleDueSoon,
    type AreaStatus,
    type LatestMaintenanceRecord,
} from "../../maintenance/utils/maintenanceScore.ts";

export interface DashboardMaintenanceRecord extends LatestMaintenanceRecord {
    vehicle: VehicleListItem;
}

export interface DashboardStatistics {
    vehicleCount: number | null;
    serviceRecordCount: number | null;
    upcomingCount: number | null;
    overdueCount: number | null;
}

export type MaintenanceDistribution = Record<AreaStatus, number>;

const MILEAGE_BASED_TYPES = new Set<MaintenanceType>([
    "OIL_FILTER",
    "AIR_FILTER",
    "CABIN_FILTER",
    "BRAKE_SERVICE",
    "TRANSMISSION",
    "BATTERY",
    "TYRE",
    "ALIGNMENT",
    "SPARK_PLUG",
    "TIMING_BELT",
]);

const DATE_BASED_TYPES = new Set<MaintenanceType>([
    "BRAKE_FLUID",
    "COOLANT",
    "INSPECTION",
]);

function applicableDueValues(record: DashboardMaintenanceRecord) {
    const mileageApplies = !DATE_BASED_TYPES.has(record.item.type);
    const dateApplies = !MILEAGE_BASED_TYPES.has(record.item.type);
    return {
        mileage: mileageApplies ? record.item.next_due_mileage : null,
        date: dateApplies ? record.item.next_due_date : null,
    };
}

function daysUntil(dateValue: string): number | null {
    const dueDate = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
    if (!Number.isFinite(dueDate.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
}

function urgencyDays(record: DashboardMaintenanceRecord): number {
    const { mileage, date } = applicableDueValues(record);
    const remaining: number[] = [];
    if (mileage !== null) {
        remaining.push((mileage - record.vehicle.current_mileage) * (30 / 1000));
    }
    if (date) {
        const days = daysUntil(date);
        if (days !== null) remaining.push(days);
    }
    return remaining.length ? Math.min(...remaining) : Number.POSITIVE_INFINITY;
}

function overdueSeverityDays(record: DashboardMaintenanceRecord): number {
    const { mileage, date } = applicableDueValues(record);
    const overdue: number[] = [];
    if (mileage !== null) {
        const distance = record.vehicle.current_mileage - mileage;
        if (distance > 0) overdue.push(distance * (30 / 1000));
    }
    if (date) {
        const days = daysUntil(date);
        if (days !== null && days < 0) overdue.push(Math.abs(days));
    }
    return overdue.length ? Math.max(...overdue) : 0;
}

export function getDashboardMaintenanceRecords(
    vehicles: VehicleListItem[],
    visits: ServiceVisit[],
): DashboardMaintenanceRecord[] {
    const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    const visitsByVehicle = new Map<string, Map<string, ServiceVisit>>();

    for (const visit of visits) {
        if (!vehiclesById.has(visit.vehicle_id)) continue;
        const vehicleVisits = visitsByVehicle.get(visit.vehicle_id) ?? new Map<string, ServiceVisit>();
        vehicleVisits.set(visit.id, visit);
        visitsByVehicle.set(visit.vehicle_id, vehicleVisits);
    }

    const records: DashboardMaintenanceRecord[] = [];
    for (const [vehicleId, vehicleVisits] of visitsByVehicle) {
        const vehicle = vehiclesById.get(vehicleId);
        if (!vehicle) continue;
        for (const record of getLatestMaintenanceRecords([...vehicleVisits.values()])) {
            records.push({ ...record, vehicle });
        }
    }
    return records;
}

export function getDashboardStatistics(
    vehicles: VehicleListItem[] | undefined,
    visits: ServiceVisit[] | undefined,
): DashboardStatistics {
    if (!vehicles) {
        return { vehicleCount: null, serviceRecordCount: null, upcomingCount: null, overdueCount: null };
    }
    if (!visits) {
        return { vehicleCount: vehicles.length, serviceRecordCount: null, upcomingCount: null, overdueCount: null };
    }

    const garageVehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
    const serviceRecordIds = new Set(
        visits.filter((visit) => garageVehicleIds.has(visit.vehicle_id)).map((visit) => visit.id),
    );
    const latestRecords = getDashboardMaintenanceRecords(vehicles, visits);

    return {
        vehicleCount: vehicles.length,
        serviceRecordCount: serviceRecordIds.size,
        upcomingCount: latestRecords.filter((record) => record.item.schedule_status === "UPCOMING").length,
        overdueCount: latestRecords.filter((record) => record.item.schedule_status === "OVERDUE").length,
    };
}

export function getMaintenanceDistribution(
    records: DashboardMaintenanceRecord[],
): MaintenanceDistribution {
    const distribution: MaintenanceDistribution = {
        UP_TO_DATE: 0,
        DUE_SOON: 0,
        OVERDUE: 0,
        NO_DATA: 0,
    };

    for (const record of records) {
        if (record.item.schedule_status === "OVERDUE") {
            distribution.OVERDUE += 1;
            continue;
        }
        if (record.item.schedule_status !== "UPCOMING"
            || (record.item.next_due_date === null && record.item.next_due_mileage === null)) {
            distribution.NO_DATA += 1;
            continue;
        }

        const dueSoon = isScheduleDueSoon({
            type: record.item.type,
            dueDate: record.item.next_due_date,
            dueMileage: record.item.next_due_mileage,
        }, record.vehicle.current_mileage);
        distribution[dueSoon ? "DUE_SOON" : "UP_TO_DATE"] += 1;
    }
    return distribution;
}

export function sortUpcomingMaintenance(records: DashboardMaintenanceRecord[]): DashboardMaintenanceRecord[] {
    return [...records]
        .filter((record) => record.item.schedule_status === "UPCOMING")
        .sort((a, b) => urgencyDays(a) - urgencyDays(b)
            || b.visit.service_date.localeCompare(a.visit.service_date));
}

export function sortOverdueMaintenance(records: DashboardMaintenanceRecord[]): DashboardMaintenanceRecord[] {
    return [...records]
        .filter((record) => record.item.schedule_status === "OVERDUE")
        .sort((a, b) => overdueSeverityDays(b) - overdueSeverityDays(a)
            || a.visit.service_date.localeCompare(b.visit.service_date));
}

export function formatUpcomingDue(record: DashboardMaintenanceRecord): string[] {
    const values: string[] = [];
    const { mileage, date } = applicableDueValues(record);
    if (mileage !== null) {
        const remaining = mileage - record.vehicle.current_mileage;
        values.push(remaining >= 0
            ? `in ${remaining.toLocaleString("en-MY")} km`
            : `${Math.abs(remaining).toLocaleString("en-MY")} km past due`);
    }
    if (date) {
        const days = daysUntil(date);
        values.push(days === null
            ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(new Date(date))
            : days >= 0 ? `in ${days} ${days === 1 ? "day" : "days"}` : `${Math.abs(days)} days past due`);
    }
    return values;
}

export function formatOverdueBy(record: DashboardMaintenanceRecord): string[] {
    const values: string[] = [];
    const { mileage, date } = applicableDueValues(record);
    if (mileage !== null && mileage < record.vehicle.current_mileage) {
        values.push(`${(record.vehicle.current_mileage - mileage).toLocaleString("en-MY")} km overdue`);
    }
    if (date) {
        const days = daysUntil(date);
        if (days !== null && days < 0) values.push(`${Math.abs(days)} days overdue`);
    }
    return values;
}


