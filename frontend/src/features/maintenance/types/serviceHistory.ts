import type { MaintenanceType } from "./maintenance";

export interface ServiceHistoryItem {
    id: string;
    type: MaintenanceType;
    description: string | null;
    cost: number | null;
}

export interface ServiceHistoryVisit {
    vehicle_id: string;
    service_date: string;
    mileage: number;
    workshop: string | null;
    total_cost: number;
    items: ServiceHistoryItem[];
}