import api from "@/shared/api/axios";
import type {
    CompleteActionPayload,
    CreateUserActionPayload,
    GeneratePlanPayload,
    MaintenancePlan,
    MaintenancePlanAction,
    UpdateActionPayload,
} from "../types/maintenancePlan";

export const maintenancePlannerApi = {
    list: async (vehicleId: string): Promise<MaintenancePlan[]> =>
        (await api.get<MaintenancePlan[]>(`/maintenance-plans/vehicles/${encodeURIComponent(vehicleId)}`)).data,
    generate: async (vehicleId: string, payload: GeneratePlanPayload): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/vehicles/${encodeURIComponent(vehicleId)}/generate`, payload)).data,
    timeline: async (vehicleId: string): Promise<MaintenancePlanAction[]> =>
        (await api.get<MaintenancePlanAction[]>(`/maintenance-plans/vehicles/${encodeURIComponent(vehicleId)}/timeline`)).data,
    approve: async (planId: string, actionIds?: string[]): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/approve`, { action_ids: actionIds })).data,
    archive: async (planId: string): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/archive`)).data,
    createAction: async (planId: string, payload: CreateUserActionPayload): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions`, payload)).data,
    updateAction: async (planId: string, actionId: string, payload: UpdateActionPayload): Promise<MaintenancePlan> =>
        (await api.patch<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}`, payload)).data,
    review: async (planId: string, actionId: string, accepted: boolean, reason?: string): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/review`, { accepted, reason })).data,
    reschedule: async (planId: string, actionId: string, payload: { target_date?: string; target_mileage?: number; reason: string }): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/reschedule`, payload)).data,
    skip: async (planId: string, actionId: string, reason: string): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/skip`, { reason })).data,
    restore: async (planId: string, actionId: string): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/restore`)).data,
    cancel: async (planId: string, actionId: string, reason: string): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/cancel`, { reason })).data,
    start: async (planId: string, actionId: string): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/start`)).data,
    complete: async (planId: string, actionId: string, payload: CompleteActionPayload): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/complete`, payload)).data,
    reminder: async (planId: string, actionId: string, payload: { enabled: boolean; advance_days?: number; advance_km?: number }): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/reminder`, payload)).data,
    dismissReminder: async (planId: string, actionId: string): Promise<MaintenancePlan> =>
        (await api.post<MaintenancePlan>(`/maintenance-plans/${encodeURIComponent(planId)}/actions/${encodeURIComponent(actionId)}/reminder/dismiss`)).data,
};
