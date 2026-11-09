import type { MaintenancePlanAction } from "../types/maintenancePlan";

export function getDefaultPlannerMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getLocalPlannerDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getPlannerCounts(actions: MaintenancePlanAction[], currentMileage: number, today: string) {
    const open = actions.filter((action) => ["PLANNED", "SCHEDULED", "IN_PROGRESS"].includes(action.status));
    return {
        proposed: actions.filter((action) => action.status === "PROPOSED").length,
        overdue: open.filter((action) =>
            ((action.scheduled_date ?? action.target_date) !== null && (action.scheduled_date ?? action.target_date)!.slice(0, 10) < today)
            || (action.target_mileage !== null && currentMileage >= action.target_mileage),
        ).length,
        upcoming: open.filter((action) => !(
            ((action.scheduled_date ?? action.target_date) !== null && (action.scheduled_date ?? action.target_date)!.slice(0, 10) < today)
            || (action.target_mileage !== null && currentMileage >= action.target_mileage)
        )).length,
        completed: actions.filter((action) => action.status === "COMPLETED").length,
    };
}

export function getActionCalendarDate(action: MaintenancePlanAction): string | null {
    return (action.completion_date ?? action.scheduled_date ?? action.target_date)?.slice(0, 10) ?? null;
}

export function getMonthCalendarDays(monthValue: string): Array<{ date: string | null; day: number | null }> {
    const [year, month] = monthValue.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) return [];
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysCount = new Date(year, month, 0).getDate();
    const result: Array<{ date: string | null; day: number | null }> = [];
    for (let index = 0; index < firstDay; index += 1) result.push({ date: null, day: null });
    for (let day = 1; day <= daysCount; day += 1) {
        result.push({ date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, day });
    }
    while (result.length % 7 !== 0) result.push({ date: null, day: null });
    return result;
}

export function getActionsForMonth(actions: MaintenancePlanAction[], monthValue: string) {
    const prefix = `${monthValue}-`;
    return actions.filter((action) => getActionCalendarDate(action)?.startsWith(prefix));
}
