import type { MaintenanceType } from "./maintenance";

export type PlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type ActionType = "SCHEDULED_SERVICE" | "PREVENTIVE_INSPECTION" | "USER_CREATED" | "RESEARCH_RECOMMENDATION";
export type ActionSource = "EXISTING_SCHEDULE" | "PREDICTIVE_REPORT" | "USER";
export type ActionPriority = "LOW" | "NORMAL" | "HIGH";
export type ActionStatus = "PROPOSED" | "PLANNED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "CANCELLED" | "REJECTED";
export type TriggerBasis = "DATE" | "MILEAGE" | "BOTH" | "UNKNOWN";

export interface ActionSourceReference {
    title: string | null;
    url: string | null;
    excerpt: string | null;
}

export interface ActionStatusEvent {
    status: ActionStatus;
    changed_at: string;
    reason: string | null;
}

export interface ReminderSettings {
    enabled: boolean;
    advance_days: number | null;
    advance_km: number | null;
    status: "ACTIVE" | "DISMISSED";
    history: Array<{ event: string; changed_at: string }>;
}

export interface MaintenancePlanAction {
    id: string;
    user_id: string;
    vehicle_id: string;
    plan_id: string;
    event_key: string;
    maintenance_type: MaintenanceType | null;
    category: string;
    component: string;
    title: string;
    description: string | null;
    action_type: ActionType;
    recommendation_source: ActionSource;
    source_references: ActionSourceReference[];
    priority: ActionPriority;
    status: ActionStatus;
    trigger_basis: TriggerBasis;
    target_mileage: number | null;
    target_date: string | null;
    target_date_estimated: boolean;
    source_due_mileage: number | null;
    source_due_date: string | null;
    scheduled_date: string | null;
    completion_date: string | null;
    completion_mileage: number | null;
    work_performed: string | null;
    service_provider: string | null;
    estimated_cost: number | null;
    actual_cost: number | null;
    notes: string | null;
    skip_reason: string | null;
    component_replaced: boolean;
    service_visit_id: string | null;
    status_history: ActionStatusEvent[];
    reminder: ReminderSettings;
    reminder_due: boolean;
    reminder_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface MaintenancePlan {
    id: string;
    user_id: string;
    vehicle_id: string;
    name: string;
    status: PlanStatus;
    horizon_months: 3 | 6 | 12;
    expected_monthly_mileage: number | null;
    version: number;
    actions: MaintenancePlanAction[];
    created_at: string;
    updated_at: string;
}

export interface GeneratePlanPayload {
    name: string;
    horizon_months: 3 | 6 | 12;
    expected_monthly_mileage?: number;
}

export interface CreateUserActionPayload {
    maintenance_type: MaintenanceType;
    category: string;
    title: string;
    description?: string;
    target_date?: string;
    target_mileage?: number;
    priority: ActionPriority;
    notes?: string;
}

export interface UpdateActionPayload {
    title?: string;
    category?: string;
    description?: string | null;
    target_date?: string | null;
    target_mileage?: number | null;
    scheduled_date?: string | null;
    priority?: ActionPriority;
    notes?: string | null;
}

export interface CompleteActionPayload {
    completion_date: string;
    actual_mileage: number;
    work_performed: string;
    service_provider?: string;
    actual_cost?: number;
    notes?: string;
    component_replaced: boolean;
    create_service_record: boolean;
    next_due_date?: string;
    next_due_mileage?: number;
}
