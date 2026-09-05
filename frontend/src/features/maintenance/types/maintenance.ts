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


// ============================================================
// Maintenance Item
// ============================================================

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


// ============================================================
// Derived Maintenance List Item
// ============================================================

export interface MaintenanceListItem extends MaintenanceItem {
    service_visit_id: string;

    user_id: string;
    vehicle_id: string;

    service_date: string;
    mileage_at_service: number;

    workshop: string | null;

    created_at: string;
    updated_at: string;
}


// ============================================================
// Create Maintenance Item
// ============================================================

export interface CreateMaintenanceItemPayload {
    type: MaintenanceType;

    description?: string | null;

    next_due_date?: string | null;
    next_due_mileage?: number | null;

    cost?: number | null;
    notes?: string | null;
}


// ============================================================
// Service Visit
// ============================================================

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


// ============================================================
// Create Service Visit
// ============================================================

export interface CreateServiceVisitPayload {
    vehicle_id: string;

    service_date: string;
    mileage_at_service: number;

    workshop?: string | null;
    notes?: string | null;

    items: CreateMaintenanceItemPayload[];
}


// ============================================================
// Update Service Visit
// ============================================================

export interface UpdateServiceVisitPayload {
    service_date?: string;

    mileage_at_service?: number;

    workshop?: string | null;

    notes?: string | null;

    items?: CreateMaintenanceItemPayload[];
}


// ============================================================
// Delete Service Visit
// ============================================================

export interface DeleteMaintenanceResponse {
    success: boolean;
}
