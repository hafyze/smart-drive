import type { MaintenanceType } from "./maintenance";

export interface ServiceHistoryItem {
    id: string;
    type: MaintenanceType;
    description: string | null;
    cost: number | null;
    notes: string | null;
}

export interface ServiceHistoryVisit {
    id: string;
    vehicle_id: string;
    service_date: string;
    mileage: number;
    workshop: string | null;
    notes: string | null;
    total_cost: number | null;
    items: ServiceHistoryItem[];
}
