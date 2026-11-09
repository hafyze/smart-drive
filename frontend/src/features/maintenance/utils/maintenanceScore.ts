import type { VehicleListItem } from "@/features/garage/types/vehicle";
import type { MaintenanceItem, MaintenanceType, ServiceVisit } from "../types/maintenance";

export type AreaName = "Engine" | "Transmission" | "Cooling" | "Brakes" | "Battery" | "Tyres";
export type AreaStatus = "UP_TO_DATE" | "DUE_SOON" | "OVERDUE" | "NO_DATA";

export interface ScoredArea {
    name: AreaName;
    status: AreaStatus;
    score: number | null;
    schedules: Array<{ type: MaintenanceType; dueDate: string | null; dueMileage: number | null }>;
}

export const AREA_TYPES: Record<AreaName, MaintenanceType[]> = {
    Engine: ["ENGINE_OIL", "OIL_FILTER", "AIR_FILTER", "CABIN_FILTER", "SPARK_PLUG", "TIMING_BELT"],
    Transmission: ["TRANSMISSION"],
    Cooling: ["COOLANT"],
    Brakes: ["BRAKE_SERVICE", "BRAKE_FLUID"],
    Battery: ["BATTERY"],
    Tyres: ["TYRE", "ALIGNMENT"],
};

export const TYPE_LABELS: Record<MaintenanceType, string> = {
    ENGINE_OIL: "Engine oil",
    OIL_FILTER: "Oil filter",
    AIR_FILTER: "Air filter",
    CABIN_FILTER: "Cabin filter",
    BRAKE_SERVICE: "Brake service",
    BRAKE_FLUID: "Brake fluid",
    COOLANT: "Coolant",
    TRANSMISSION: "Transmission",
    BATTERY: "Battery",
    TYRE: "Tyres",
    ALIGNMENT: "Wheel alignment",
    SPARK_PLUG: "Spark plugs",
    TIMING_BELT: "Timing belt",
    INSPECTION: "Inspection",
    OTHER: "Other",
};

export const STATUS_CONTENT: Record<AreaStatus, { label: string; description: string; className: string }> = {
    UP_TO_DATE: { label: "Up to date", description: "Recorded schedules are outside the due-soon window.", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    DUE_SOON: { label: "Due soon", description: "A recorded schedule is due within 1,000 km or 30 days.", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    OVERDUE: { label: "Overdue", description: "At least one latest recorded schedule has passed its due point.", className: "bg-destructive/10 text-destructive" },
    NO_DATA: { label: "No data", description: "No saved next-due schedule is available for this area.", className: "bg-muted text-muted-foreground" },
};

function currentLocalDate() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function mostRecentSchedule(maintenance: MaintenanceItem[], visits: ServiceVisit[]) {
    const serviceDateByItem = new Map<string, { date: string; mileage: number }>();
    for (const visit of visits) {
        for (const item of visit.items) {
            serviceDateByItem.set(item.id, { date: visit.service_date, mileage: visit.mileage_at_service });
        }
    }

    const latestByType = new Map<MaintenanceType, MaintenanceItem>();
    const sorted = [...maintenance].sort((a, b) => {
        const aVisit = serviceDateByItem.get(a.id);
        const bVisit = serviceDateByItem.get(b.id);
        return (bVisit?.date ?? "").localeCompare(aVisit?.date ?? "") ||
            (bVisit?.mileage ?? 0) - (aVisit?.mileage ?? 0);
    });

    for (const item of sorted) {
        if (!latestByType.has(item.type)) latestByType.set(item.type, item);
    }
    return latestByType;
}

function getAreaStatus(
    schedules: ScoredArea["schedules"],
    currentMileage: number,
    today: string,
): AreaStatus {
    if (schedules.length === 0) return "NO_DATA";

    let dueSoon = false;
    for (const schedule of schedules) {
        if (schedule.dueMileage !== null) {
            const distance = schedule.dueMileage - currentMileage;
            if (distance < 0) return "OVERDUE";
            if (distance <= 1000) dueSoon = true;
        }
        if (schedule.dueDate) {
            if (schedule.dueDate < today) return "OVERDUE";
            const due = new Date(`${schedule.dueDate}T00:00:00`);
            const now = new Date(`${today}T00:00:00`);
            const daysRemaining = Math.round((due.getTime() - now.getTime()) / 86_400_000);
            if (daysRemaining <= 30) dueSoon = true;
        }
    }
    return dueSoon ? "DUE_SOON" : "UP_TO_DATE";
}

export function calculateAreas(vehicle: Pick<VehicleListItem, "current_mileage">, visits: ServiceVisit[]): ScoredArea[] {
    const latestByType = mostRecentSchedule(visits.flatMap((visit) => visit.items), visits);
    const today = currentLocalDate();

    return (Object.keys(AREA_TYPES) as AreaName[]).map((name) => {
        const schedules = AREA_TYPES[name]
            .map((type) => latestByType.get(type))
            .filter((item): item is MaintenanceItem => Boolean(item))
            .filter((item) => item.next_due_date !== null || item.next_due_mileage !== null)
            .map((item) => ({ type: item.type, dueDate: item.next_due_date, dueMileage: item.next_due_mileage }));
        const status = getAreaStatus(schedules, vehicle.current_mileage, today);
        const score = status === "UP_TO_DATE" ? 100 : status === "DUE_SOON" ? 70 : status === "OVERDUE" ? 30 : null;
        return { name, status, score, schedules };
    });
}

export function calculateOverallScore(areas: ScoredArea[]) {
    const scored = areas.filter((area) => area.score !== null);
    return {
        eligibleCount: scored.length,
        score: scored.length >= 2
            ? Math.round(scored.reduce((total, area) => total + (area.score ?? 0), 0) / scored.length)
            : null,
    };
}
