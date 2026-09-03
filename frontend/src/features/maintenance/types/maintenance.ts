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
    | "COMPLETED";

export type MaintenanceScheduleStatus =
    | "UPCOMING"
    | "OVERDUE";

// Maintenance Item

export interface MaintenanceItem {
    id: string;

    type: MaintenanceType;
    description: string | null;

    next_due_date: string | null;
    next_due_mileage: number | null;

    cost: number | null;
    notes: string | null;

    status: MaintenanceStatus;
    schedule_status: MaintenanceScheduleStatus | null;
}

export interface CreateMaintenanceItemPayload {
    type: MaintenanceType;
    description?: string | null;

    next_due_date?: string | null;
    next_due_mileage?: number | null;

    cost?: number | null;
    notes?: string | null;
}

export interface UpdateMaintenanceItemPayload {
    type?: MaintenanceType;
    description?: string | null;

    next_due_date?: string | null;
    next_due_mileage?: number | null;

    cost?: number | null;
    notes?: string | null;
}

export interface MaintenanceItemResponse extends MaintenanceItem {}

// Service Visit
export interface ServiceVisit {
    id: string;
    user_id: string;
    vehicle_id: string;

    service_date: string;
    mileage_at_service: number;

    workshop: string | null;
    notes: string | null;

    items: MaintenanceItem[];

    created_at: string;
    updated_at: string;
}

export interface CreateServiceVisitPayload {
    vehicle_id: string;

    service_date: string;
    mileage_at_service: number;

    workshop?: string | null;
    notes?: string | null;

    items: CreateMaintenanceItemPayload[];
}

export interface UpdateServiceVisitPayload {
    service_date?: string;
    mileage_at_service?: number;

    workshop?: string | null;
    notes?: string | null;

    items?: UpdateMaintenanceItemPayload[];
}

// ============================================================
// Compatibility Types
// ============================================================
//
// These aliases allow existing maintenance UI components to
// continue working while the frontend is being migrated to
// the Service Visit + Maintenance Item architecture.

export interface Maintenance extends MaintenanceItem {
    user_id: string;
    vehicle_id: string;

    service_date: string;
    mileage_at_service: number;

    workshop: string | null;

    created_at: string;
    updated_at: string;
}

export type MaintenanceListItem = Maintenance;

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