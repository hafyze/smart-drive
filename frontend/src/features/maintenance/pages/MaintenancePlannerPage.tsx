import { useEffect, useMemo, useState } from "react";
import { Archive, Bell, CalendarClock, CheckCircle2, CircleAlert, ClipboardList, Plus, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { useVehicles } from "@/features/garage/hooks/useVehicles";
import type { VehicleListItem } from "@/features/garage/types/vehicle";
import { getApiErrorMessage } from "@/shared/utils/api-error";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import type { CompleteActionPayload, CreateUserActionPayload, MaintenancePlanAction, UpdateActionPayload } from "../types/maintenancePlan";
import { maintenancePlannerApi } from "../api/maintenancePlannerApi";
import { useMaintenancePlannerMutation, useMaintenancePlans } from "../hooks/useMaintenancePlanner";
import { getDefaultPlannerMonth, getLocalPlannerDate, getPlannerCounts } from "../utils/maintenancePlannerData";
import { MaintenanceActionCard } from "../components/planner/MaintenanceActionCard";
import { MaintenanceActionFormDialog } from "../components/planner/MaintenanceActionFormDialog";
import { MaintenanceCompletionDialog } from "../components/planner/MaintenanceCompletionDialog";
import { MaintenancePlannerCalendar } from "../components/planner/MaintenancePlannerCalendar";

const controlClass = "h-10 rounded-lg border border-white/15 bg-[#101214] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-red-400";
const PLAN_STATUS: Record<string, string> = { DRAFT: "Draft", ACTIVE: "Active", COMPLETED: "Completed", ARCHIVED: "Archived" };

function updateQuery(setSearchParams: ReturnType<typeof useSearchParams>[1], key: string, value: string | null) {
    setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
    });
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: {
    icon: typeof ClipboardList;
    label: string;
    value: number;
    detail: string;
    tone: string;
}) {
    return <Card className="border-white/10 bg-[#111315] text-white"><CardContent className="flex items-center gap-3 p-4"><span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span><div><p className="text-xs text-white/50">{label}</p><p className="font-heading text-2xl font-semibold">{value}</p><p className="text-[11px] text-white/40">{detail}</p></div></CardContent></Card>;
}

function PlannerGenerationControls({ selectedPlan, busy, onGenerate }: {
    selectedPlan?: import("../types/maintenancePlan").MaintenancePlan;
    busy: boolean;
    onGenerate: (horizon: 3 | 6 | 12, monthlyMileage: string) => Promise<void>;
}) {
    const [horizon, setHorizon] = useState<3 | 6 | 12>(selectedPlan?.horizon_months ?? 6);
    const [monthlyMileage, setMonthlyMileage] = useState(selectedPlan?.expected_monthly_mileage?.toString() ?? "");
    return <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <div className="space-y-2"><label htmlFor="planner-horizon" className="text-xs text-white/55">Planning horizon</label><select id="planner-horizon" className={`${controlClass} w-full`} value={horizon} onChange={(event) => setHorizon(Number(event.target.value) as 3 | 6 | 12)}><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option></select></div>
        <div className="space-y-2"><label htmlFor="planner-monthly-mileage" className="text-xs text-white/55">Expected monthly mileage (optional)</label><Input id="planner-monthly-mileage" type="number" min="1" max="20000" placeholder="Leave blank for no date estimate" className="border-white/15 bg-[#101214] text-white placeholder:text-white/30" value={monthlyMileage} onChange={(event) => setMonthlyMileage(event.target.value)} /></div>
        <Button type="button" disabled={busy || (monthlyMileage !== "" && (Number(monthlyMileage) < 1 || Number(monthlyMileage) > 20_000))} onClick={() => void onGenerate(horizon, monthlyMileage)} className="bg-red-600 text-white hover:bg-red-500"><RefreshCw className="size-4" />{busy ? "Working…" : "Generate draft"}</Button>
    </div>;
}

export default function MaintenancePlannerPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const vehiclesQuery = useVehicles();
    const vehicles: VehicleListItem[] = vehiclesQuery.data ?? [];
    const requestedVehicleId = searchParams.get("vehicleId") ?? "";
    const vehicle = vehicles.find((item) => item.id === requestedVehicleId) ?? vehicles[0];
    const vehicleId = vehicle?.id ?? "";
    const plansQuery = useMaintenancePlans(vehicleId);
    const plans = plansQuery.data ?? [];
    const requestedPlanId = searchParams.get("planId") ?? "";
    const selectedPlan = plans.find((item) => item.id === requestedPlanId)
        ?? plans.find((item) => item.status === "DRAFT")
        ?? plans.find((item) => item.status === "ACTIVE")
        ?? plans[0];
    const mutation = useMaintenancePlannerMutation(vehicleId);
    const [calendarMonth, setCalendarMonth] = useState(getDefaultPlannerMonth);
    const [addActionOpen, setAddActionOpen] = useState(false);
    const [completionAction, setCompletionAction] = useState<MaintenancePlanAction | null>(null);

    useEffect(() => {
        if (!vehicle || requestedVehicleId === vehicle.id) return;
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("vehicleId", vehicle.id);
            next.delete("planId");
            return next;
        });
    }, [vehicle, requestedVehicleId, setSearchParams]);

    useEffect(() => {
        if (!selectedPlan || requestedPlanId === selectedPlan.id) return;
        updateQuery(setSearchParams, "planId", selectedPlan.id);
    }, [selectedPlan, requestedPlanId, setSearchParams]);

    const counts = useMemo(() => getPlannerCounts(selectedPlan?.actions ?? [], vehicle?.current_mileage ?? 0, getLocalPlannerDate()), [selectedPlan?.actions, vehicle?.current_mileage]);
    const proposed = selectedPlan?.actions.filter((action) => action.status === "PROPOSED") ?? [];
    const openActions = selectedPlan?.actions.filter((action) => ["PLANNED", "SCHEDULED", "IN_PROGRESS"].includes(action.status)) ?? [];
    const otherActions = selectedPlan?.actions.filter((action) => ["COMPLETED", "SKIPPED", "CANCELLED", "REJECTED"].includes(action.status)) ?? [];
    const reminders = selectedPlan?.actions.filter((action) => action.reminder.enabled && action.status !== "COMPLETED" && action.status !== "CANCELLED" && action.status !== "REJECTED" && action.status !== "SKIPPED") ?? [];

    const perform = async (operation: () => Promise<import("../types/maintenancePlan").MaintenancePlan>) => {
        try { return await mutation.mutateAsync(operation); } catch { return undefined; }
    };
    const generate = async (horizon: 3 | 6 | 12, monthlyMileage: string) => {
        if (!vehicleId) return;
        const generated = await perform(() => maintenancePlannerApi.generate(vehicleId, {
            name: `${vehicle?.nickname || `${vehicle?.manufacturer ?? "Vehicle"} ${vehicle?.model ?? ""}`.trim()} maintenance plan`,
            horizon_months: horizon,
            ...(monthlyMileage ? { expected_monthly_mileage: Number(monthlyMileage) } : {}),
        }));
        if (!generated) return;
        updateQuery(setSearchParams, "planId", generated.id);
    };
    const createAction = async (payload: CreateUserActionPayload) => {
        if (!selectedPlan) return;
        const result = await perform(() => maintenancePlannerApi.createAction(selectedPlan.id, payload));
        if (!result) throw new Error("Unable to save the maintenance action.");
    };
    const updateAction = async (action: MaintenancePlanAction, payload: UpdateActionPayload) => {
        if (!selectedPlan) return;
        const result = await perform(() => maintenancePlannerApi.updateAction(selectedPlan.id, action.id, payload));
        if (!result) throw new Error("Unable to save the maintenance action.");
    };
    const completeAction = async (action: MaintenancePlanAction, payload: CompleteActionPayload) => {
        if (!selectedPlan) return;
        const result = await perform(() => maintenancePlannerApi.complete(selectedPlan.id, action.id, payload));
        if (!result) throw new Error("Unable to complete the maintenance action.");
    };

    const renderAction = (action: MaintenancePlanAction) => <MaintenanceActionCard
        key={action.id}
        action={action}
        currentMileage={vehicle?.current_mileage ?? 0}
        busy={mutation.isPending}
        onReview={(accepted) => { if (selectedPlan) void perform(() => maintenancePlannerApi.review(selectedPlan.id, action.id, accepted)); }}
        onEdit={(payload) => updateAction(action, payload)}
        onStart={() => { if (selectedPlan) void perform(() => maintenancePlannerApi.start(selectedPlan.id, action.id)); }}
        onComplete={() => setCompletionAction(action)}
        onReschedule={(payload) => { if (selectedPlan) void perform(() => maintenancePlannerApi.reschedule(selectedPlan.id, action.id, payload)); }}
        onSkip={(reason) => { if (selectedPlan) void perform(() => maintenancePlannerApi.skip(selectedPlan.id, action.id, reason)); }}
        onCancel={(reason) => { if (selectedPlan) void perform(() => maintenancePlannerApi.cancel(selectedPlan.id, action.id, reason)); }}
        onRestore={() => { if (selectedPlan) void perform(() => maintenancePlannerApi.restore(selectedPlan.id, action.id)); }}
        onReminder={(payload) => { if (selectedPlan) void perform(() => maintenancePlannerApi.reminder(selectedPlan.id, action.id, payload)); }}
        onDismissReminder={() => { if (selectedPlan) void perform(() => maintenancePlannerApi.dismissReminder(selectedPlan.id, action.id)); }}
    />;

    return <main className="dark min-h-[calc(100vh-4rem)] min-w-0 space-y-5 bg-[#0b0d0f] p-3 text-white sm:space-y-6 sm:p-5 lg:p-7">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_85%_10%,rgba(239,68,68,.14),transparent_42%),#111315] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-red-300">Maintenance planning</p><h1 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">Preventive Maintenance Planner</h1><p className="mt-2 max-w-2xl text-sm text-white/55">Review schedules and source-backed guidance, then choose what becomes part of your plan.</p></div>
            <Button type="button" variant="outline" render={<Link to={vehicleId ? `/ai?vehicleId=${encodeURIComponent(vehicleId)}` : "/ai"} />} className="border-white/15 bg-white/[.04] text-white hover:bg-white/10 hover:text-white">Maintenance score and research</Button>
        </header>

        <Card className="border-white/10 bg-[#111315] text-white"><CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:items-end sm:p-5">
            <div className="space-y-2"><label htmlFor="planner-vehicle" className="text-sm font-medium">Vehicle</label>{vehiclesQuery.isLoading ? <div className="h-10 animate-pulse rounded-lg bg-white/10" /> : <select id="planner-vehicle" className={`${controlClass} w-full`} value={vehicleId} onChange={(event) => setSearchParams((current) => { const next = new URLSearchParams(current); if (event.target.value) next.set("vehicleId", event.target.value); else next.delete("vehicleId"); next.delete("planId"); return next; })}><option value="">Choose a vehicle</option>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.manufacturer} {item.model} · {item.nickname}</option>)}</select>}{vehicle && <p className="text-xs text-white/45">{vehicle.year} · {vehicle.current_mileage.toLocaleString("en-MY")} km current odometer</p>}</div>
            {vehicle && <PlannerGenerationControls key={`${vehicleId}:${selectedPlan?.id ?? "new"}`} selectedPlan={selectedPlan} busy={mutation.isPending} onGenerate={generate} />}
        </CardContent></Card>

        {vehiclesQuery.isError && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{getApiErrorMessage(vehiclesQuery.error)}</p>}
        {!vehiclesQuery.isLoading && !vehiclesQuery.isError && vehicles.length === 0 && <Card className="border-white/10 bg-[#111315] text-white"><CardContent className="p-8 text-center"><Wrench className="mx-auto size-8 text-white/35" /><h2 className="mt-3 font-heading text-lg font-semibold">Add a vehicle to start planning</h2><p className="mt-1 text-sm text-white/50">The planner uses the vehicle’s saved schedules and service history.</p><Button className="mt-4 bg-red-600 text-white hover:bg-red-500" render={<Link to="/garage" />}>Open Garage</Button></CardContent></Card>}
        {vehicle && plansQuery.isLoading && <Card className="border-white/10 bg-[#111315]"><CardContent className="h-36 animate-pulse p-5" /></Card>}
        {vehicle && plansQuery.isError && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{getApiErrorMessage(plansQuery.error)}</p>}
        {mutation.isError && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{getApiErrorMessage(mutation.error)} <button type="button" onClick={() => mutation.reset()} className="ml-2 underline">Dismiss</button></p>}

        {vehicle && !plansQuery.isLoading && !plansQuery.isError && !selectedPlan && <Card className="border-white/10 bg-[#111315] text-white"><CardContent className="flex min-h-52 flex-col items-center justify-center p-7 text-center"><ClipboardList className="size-8 text-red-300" /><h2 className="mt-3 font-heading text-xl font-semibold">No maintenance plan yet</h2><p className="mt-1 max-w-lg text-sm text-white/55">Generate a draft from saved due schedules and eligible cached Phase 3 research. It will not activate actions or call AI providers.</p></CardContent></Card>}

        {vehicle && selectedPlan && <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div><h2 className="font-heading text-xl font-semibold">{selectedPlan.name}</h2><p className="text-xs text-white/50">{vehicle.manufacturer} {vehicle.model} · {selectedPlan.horizon_months} month horizon · plan v{selectedPlan.version}</p></div><Badge className={selectedPlan.status === "ACTIVE" ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100" : "border-white/15 bg-white/[.04] text-white/65"}>{PLAN_STATUS[selectedPlan.status]}</Badge></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="planner-plan-picker">Select plan</label><select id="planner-plan-picker" className={controlClass} value={selectedPlan.id} onChange={(event) => updateQuery(setSearchParams, "planId", event.target.value)}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {PLAN_STATUS[plan.status]}</option>)}</select>{selectedPlan.status !== "ARCHIVED" && selectedPlan.status !== "COMPLETED" && <><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setAddActionOpen(true)}><Plus className="size-4" />Add personal action</Button><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => void perform(() => maintenancePlannerApi.archive(selectedPlan.id))}><Archive className="size-4" />Archive plan</Button></>}</div></div>

            <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
                <SummaryCard icon={ClipboardList} label="Proposed" value={counts.proposed} detail="Waiting for your review" tone="bg-amber-500/10 text-amber-200" />
                <SummaryCard icon={CalendarClock} label="Upcoming" value={counts.upcoming} detail="Approved planned actions" tone="bg-sky-500/10 text-sky-200" />
                <SummaryCard icon={CircleAlert} label="Overdue" value={counts.overdue} detail="Past saved target" tone="bg-red-500/10 text-red-200" />
                <SummaryCard icon={CheckCircle2} label="Completed" value={counts.completed} detail="Retained in plan history" tone="bg-emerald-500/10 text-emerald-200" />
            </section>

            <div className="grid min-w-0 gap-5 2xl:grid-cols-[1.1fr_.9fr]">
                <div className="min-w-0 space-y-5">
                    {proposed.length > 0 && <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-heading text-lg font-semibold">Review proposed actions</h2><p className="text-xs text-white/50">Nothing is activated until you approve it.</p></div>{selectedPlan.status === "DRAFT" && <Button type="button" size="sm" disabled={mutation.isPending} onClick={() => void perform(() => maintenancePlannerApi.approve(selectedPlan.id, proposed.map((action) => action.id)))} className="bg-red-600 text-white hover:bg-red-500"><ShieldCheck className="size-4" />Approve all proposed</Button>}</div>{proposed.map(renderAction)}</section>}
                    <section className="space-y-3"><div><h2 className="font-heading text-lg font-semibold">Upcoming maintenance</h2><p className="text-xs text-white/50">Approved work; date and mileage triggers remain distinct.</p></div>{openActions.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">No approved upcoming actions in this plan.</p> : openActions.map(renderAction)}</section>
                    {otherActions.length > 0 && <details className="group rounded-xl border border-white/10 bg-[#111315]"><summary className="cursor-pointer list-none p-4 font-heading font-semibold [&::-webkit-details-marker]:hidden">Action history <span className="ml-1 text-xs font-normal text-white/45">({otherActions.length})</span></summary><div className="space-y-3 border-t border-white/10 p-3">{otherActions.map(renderAction)}</div></details>}
                </div>
                <div className="min-w-0 space-y-5">
                    <MaintenancePlannerCalendar actions={selectedPlan.actions} month={calendarMonth} onMonthChange={setCalendarMonth} />
                    <Card className="border-white/10 bg-[#111315] text-white"><CardHeader><h2 className="inline-flex items-center gap-2 font-heading text-lg font-semibold"><Bell className="size-4 text-amber-200" />In-app reminders</h2><p className="text-xs text-white/50">Thresholds are checked when this planner is opened. Background, email, and push delivery are not configured.</p></CardHeader><CardContent className="space-y-2">{reminders.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-sm text-white/50">No active reminders. Set one on a planned action.</p> : reminders.map((action) => <div key={action.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{action.title}</p><p className="text-xs text-white/45">{action.reminder_due ? `Due by ${action.reminder_reason} threshold` : "Waiting for date or mileage threshold"}</p></div>{action.reminder_due && <Button type="button" size="sm" variant="outline" disabled={mutation.isPending} onClick={() => void perform(() => maintenancePlannerApi.dismissReminder(selectedPlan.id, action.id))}>Dismiss</Button>}</div>)}</CardContent></Card>
                    <Card className="border-white/10 bg-[#111315] text-white"><CardContent className="space-y-2 p-4 text-xs leading-5 text-white/50"><p>Generated schedules and cached research enter as Proposed. Research actions retain source excerpts for owner review and are not technical instructions.</p><p>Mileage dates are projected only when you enter an expected monthly mileage. No maintenance interval, cost, service record, or reminder delivery is invented.</p></CardContent></Card>
                </div>
            </div>
        </>}

        {selectedPlan && <MaintenanceActionFormDialog key={`new:${addActionOpen}`} open={addActionOpen} onOpenChange={setAddActionOpen} busy={mutation.isPending} onCreate={createAction} onUpdate={async () => undefined} />}
        <MaintenanceCompletionDialog key={`${completionAction?.id ?? "none"}:${completionAction !== null}`} action={completionAction} currentMileage={vehicle?.current_mileage ?? 0} open={completionAction !== null} onOpenChange={(open) => { if (!open) setCompletionAction(null); }} busy={mutation.isPending} onComplete={async (payload) => { if (completionAction) await completeAction(completionAction, payload); setCompletionAction(null); }} />
    </main>;
}
