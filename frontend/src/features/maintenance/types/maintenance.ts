export type MaintenanceType =
    | "ENGINE_OIL"
    | "OIL_FILTER"
    | "AIR_FILTER"
    | "CABIN_FILTER"
    | "BRAKE_SERVICE"
    | "BRAKE_FLUID"
    | "COOLANT"
    | "TRANSMISSION"
    | "BATTERY"
    | "TYRE"
    | "ALIGNMENT"
    | "SPARK_PLUG"
    | "TIMING_BELT"
    | "INSPECTION"
    | "OTHER";

export type MaintenanceStatus =
    | "COMPLETED"
    | "UPCOMING"
    | "OVERDUE";

export interface Maintenance {
    id: string;
    user_id: string;
    vehicle_id: string;

    type: MaintenanceType;
    description: string | null;

    service_date: string;
    mileage_at_service: number;

    next_due_date: string | null;
    next_due_mileage: number | null;

    cost: number | null;
    workshop: string | null;
    notes: string | null;

    status: MaintenanceStatus;

    created_at: string;
    updated_at: string;
}

export interface MaintenanceListItem {
    id: string;
    vehicle_id: string;

    type: MaintenanceType;
    description: string | null;

    service_date: string;
    mileage_at_service: number;

    next_due_date: string | null;
    next_due_mileage: number | null;

    cost: number | null;
    workshop: string | null;
    notes: string | null;

    status: MaintenanceStatus;
}

export interface CreateMaintenancePayload {
    vehicle_id: string;

    type: MaintenanceType;
    description: string | null;

    service_date: string;
    mileage_at_service: number;

    next_due_date?: string | null;
    next_due_mileage?: number | null;

    cost?: number | null;
    workshop?: string | null;
    notes?: string | null;
}

export interface UpdateMaintenancePayload {
    type?: MaintenanceType;
    description?: string | null;

    service_date?: string;
    mileage_at_service?: number;

    next_due_date?: string | null;
    next_due_mileage?: number | null;

    cost?: number | null;
    workshop?: string | null;
    notes?: string | null;
}

export interface DeleteMaintenanceResponse {
    success: boolean;
}