import { CalendarDays } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import type { MaintenancePlanAction } from "../../types/maintenancePlan";
import { getActionCalendarDate, getActionsForMonth, getMonthCalendarDays } from "../../utils/maintenancePlannerData";

export function MaintenancePlannerCalendar({ actions, month, onMonthChange }: {
    actions: MaintenancePlanAction[];
    month: string;
    onMonthChange: (month: string) => void;
}) {
    const days = getMonthCalendarDays(month);
    const monthlyActions = getActionsForMonth(actions, month);
    const byDate = new Map<string, MaintenancePlanAction[]>();
    for (const action of monthlyActions) {
        const date = getActionCalendarDate(action);
        if (date) byDate.set(date, [...(byDate.get(date) ?? []), action]);
    }
    const undatedMileageActions = actions.filter((action) => action.target_mileage !== null && !action.target_date && !action.scheduled_date && !action.completion_date && !["COMPLETED", "CANCELLED", "REJECTED", "SKIPPED"].includes(action.status));
    const dateObj = new Date(`${month}-01T00:00:00`);
    const monthLabel = Number.isFinite(dateObj.getTime()) ? new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(dateObj) : "Maintenance calendar";

    return <Card className="border-white/10 bg-[#111315] text-white">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div><h2 className="inline-flex items-center gap-2 font-heading text-lg font-semibold"><CalendarDays className="size-4 text-red-300" />Maintenance calendar</h2><p className="text-xs text-white/50">Dates come from saved targets, appointment dates, or completion records.</p></div>
            <Input aria-label="Calendar month" type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} className="w-40 border-white/15 bg-[#0d0f11] text-white" />
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm font-medium">{monthLabel}</p>
            <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`${monthLabel} maintenance calendar`}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => <div key={weekday} className="pb-1 text-center text-[10px] font-medium uppercase text-white/40" role="columnheader">{weekday}</div>)}
                {days.map((entry, index) => {
                    const items = entry.date ? byDate.get(entry.date) ?? [] : [];
                    return <div key={`${entry.date ?? "blank"}-${index}`} role="gridcell" aria-label={entry.date ?? undefined} className={`min-h-[4.5rem] min-w-0 rounded-lg border p-1.5 ${entry.date ? "border-white/10 bg-white/[.025]" : "border-transparent"}`}>
                        {entry.day !== null && <><span className="text-[10px] text-white/45">{entry.day}</span><div className="mt-1 space-y-1">{items.slice(0, 2).map((item) => <div key={item.id} title={`${item.title} — ${item.status.toLowerCase()}`} className={`truncate rounded px-1 py-0.5 text-[9px] ${item.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-100" : item.status === "PROPOSED" ? "bg-amber-500/15 text-amber-100" : "bg-red-500/15 text-red-100"}`}>{item.title}</div>)}{items.length > 2 && <span className="text-[9px] text-white/45">+{items.length - 2} more</span>}</div></>}
                    </div>;
                })}
            </div>
            {monthlyActions.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-sm text-white/50">No dated planner actions fall in this month.</p>}
            {undatedMileageActions.length > 0 && <div className="border-t border-white/10 pt-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">Mileage targets · calendar date unknown</h3><ul className="mt-2 space-y-1 text-sm text-white/65">{undatedMileageActions.map((action) => <li key={action.id} className="flex justify-between gap-2"><span className="truncate">{action.title}</span><span className="shrink-0">{action.target_mileage?.toLocaleString("en-MY")} km</span></li>)}</ul></div>}
            <div className="flex flex-wrap gap-2 text-[10px]"><Badge className="border-amber-300/20 bg-amber-400/10 text-amber-100">Proposed</Badge><Badge className="border-red-300/20 bg-red-400/10 text-red-100">Open</Badge><Badge className="border-emerald-300/20 bg-emerald-400/10 text-emerald-100">Completed</Badge></div>
        </CardContent>
    </Card>;
}
