import { useState } from "react";
import { ExternalLink, FileText, Gauge, History, Pencil, Play, RotateCcw, ShieldCheck, Trash2, Wrench } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Textarea } from "@/shared/components/ui/textarea";
import type { ActionStatus, MaintenancePlanAction, UpdateActionPayload } from "../../types/maintenancePlan";
import { getLocalPlannerDate } from "../../utils/maintenancePlannerData";
import { MaintenanceActionFormDialog } from "./MaintenanceActionFormDialog";

const STATUS_LABELS: Record<ActionStatus, string> = {
    PROPOSED: "Proposed", PLANNED: "Planned", SCHEDULED: "Scheduled", IN_PROGRESS: "In progress",
    COMPLETED: "Completed", SKIPPED: "Skipped", CANCELLED: "Cancelled", REJECTED: "Rejected",
};
const STATUS_CLASS: Record<ActionStatus, string> = {
    PROPOSED: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    PLANNED: "border-sky-300/20 bg-sky-400/10 text-sky-100",
    SCHEDULED: "border-sky-300/20 bg-sky-400/10 text-sky-100",
    IN_PROGRESS: "border-violet-300/20 bg-violet-400/10 text-violet-100",
    COMPLETED: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    SKIPPED: "border-white/15 bg-white/[.04] text-white/60",
    CANCELLED: "border-white/15 bg-white/[.04] text-white/60",
    REJECTED: "border-white/15 bg-white/[.04] text-white/60",
};
const controlClass = "h-10 w-full rounded-lg border border-white/15 bg-[#111315] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-red-400";
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : null;

type ReminderInput = { enabled: boolean; advance_days?: number; advance_km?: number };

export function MaintenanceActionCard({
    action, currentMileage, busy, onReview, onEdit, onStart, onComplete, onReschedule, onSkip, onCancel, onRestore, onReminder, onDismissReminder,
}: {
    action: MaintenancePlanAction;
    currentMileage: number;
    busy: boolean;
    onReview: (accepted: boolean) => void;
    onEdit: (payload: UpdateActionPayload) => Promise<void>;
    onStart: () => void;
    onComplete: () => void;
    onReschedule: (payload: { target_date?: string; target_mileage?: number; scheduled_date?: string; reason: string }) => void;
    onSkip: (reason: string) => void;
    onCancel: (reason: string) => void;
    onRestore: () => void;
    onReminder: (payload: ReminderInput) => void;
    onDismissReminder: () => void;
}) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [operation, setOperation] = useState<"reschedule" | "skip" | "cancel" | "reminder" | null>(null);
    const [targetDate, setTargetDate] = useState((action.target_date ?? "").slice(0, 10));
    const [targetMileage, setTargetMileage] = useState(action.target_mileage?.toString() ?? "");
    const [scheduledDate, setScheduledDate] = useState((action.scheduled_date ?? "").slice(0, 10));
    const [reason, setReason] = useState("");
    const [advanceDays, setAdvanceDays] = useState(action.reminder.advance_days?.toString() ?? "30");
    const [advanceKm, setAdvanceKm] = useState(action.reminder.advance_km?.toString() ?? "1000");
    const [reminderEnabled, setReminderEnabled] = useState(action.reminder.enabled);

    const proposed = action.status === "PROPOSED";
    const open = ["PLANNED", "SCHEDULED", "IN_PROGRESS"].includes(action.status);
    const reminderDateTarget = action.scheduled_date ?? action.target_date;
    const targetReached = (action.target_date && action.target_date.slice(0, 10) <= getLocalPlannerDate())
        || (action.target_mileage !== null && currentMileage >= action.target_mileage);
    const targetLabel = [
        action.target_date ? `${formatDate(action.target_date)}${action.target_date_estimated ? " estimated" : ""}` : null,
        action.target_mileage !== null ? `${action.target_mileage.toLocaleString("en-MY")} km` : null,
    ].filter(Boolean).join(" · ");

    const submitOperation = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (operation === "reschedule") {
            onReschedule({
                target_date: targetDate || undefined,
                target_mileage: targetMileage ? Number(targetMileage) : undefined,
                scheduled_date: scheduledDate || undefined,
                reason,
            });
        } else if (operation === "skip") onSkip(reason);
        else if (operation === "cancel") onCancel(reason);
        else if (operation === "reminder") onReminder({
            enabled: reminderEnabled,
            advance_days: reminderDateTarget && advanceDays ? Number(advanceDays) : undefined,
            advance_km: action.target_mileage !== null && advanceKm ? Number(advanceKm) : undefined,
        });
        setOperation(null);
        setReason("");
    };

    return <>
        <Card className="border-white/10 bg-[#111315] text-white">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-semibold">{action.title}</h3>
                        <Badge className={STATUS_CLASS[action.status]}>{STATUS_LABELS[action.status]}</Badge>
                        <Badge className={action.priority === "HIGH" ? "border-red-300/20 bg-red-500/10 text-red-100" : "border-white/15 bg-white/[.04] text-white/65"}>{action.priority.toLowerCase()} priority</Badge>
                        {targetReached && open && <Badge className="border-red-300/20 bg-red-500/10 text-red-100">Due</Badge>}
                        {action.reminder_due && <Badge className="border-amber-300/20 bg-amber-400/10 text-amber-100">Reminder due</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-white/50">{action.category} · {action.recommendation_source.replaceAll("_", " ").toLowerCase()}</p>
                    {action.description && <p className="mt-2 line-clamp-2 text-sm text-white/70">{action.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                        {targetLabel && <span className="inline-flex items-center gap-1.5"><Gauge className="size-3.5" />{targetLabel}</span>}
                        {action.scheduled_date && <span>Scheduled {formatDate(action.scheduled_date)}</span>}
                        {action.completion_date && <span>Completed {formatDate(action.completion_date)}{action.completion_mileage !== null ? ` · ${action.completion_mileage.toLocaleString("en-MY")} km` : ""}</span>}
                        {action.reminder.enabled && <span>Reminder: {action.reminder.advance_days !== null ? `${action.reminder.advance_days} days` : ""}{action.reminder.advance_days !== null && action.reminder.advance_km !== null ? " / " : ""}{action.reminder.advance_km !== null ? `${action.reminder.advance_km.toLocaleString("en-MY")} km` : ""} before</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:max-w-[390px] sm:justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => setDetailsOpen(true)}><FileText className="size-3.5" /> Details</Button>
                    {proposed && <>
                        <Button type="button" size="sm" disabled={busy} onClick={() => onReview(true)} className="bg-red-600 text-white hover:bg-red-500"><ShieldCheck className="size-3.5" /> Approve</Button>
                        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onReview(false)}>Reject</Button>
                    </>}
                    {open && <>
                        {action.status !== "IN_PROGRESS" && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onStart}><Play className="size-3.5" /> Start</Button>}
                        <Button type="button" size="sm" disabled={busy} onClick={onComplete} className="bg-red-600 text-white hover:bg-red-500"><Wrench className="size-3.5" /> Complete</Button>
                        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setOperation("reschedule"); setReason(""); }}><RotateCcw className="size-3.5" /> Reschedule</Button>
                        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setOperation("skip"); setReason(""); }}><span className="sr-only">Skip action</span>Skip</Button>
                        <Button type="button" variant="outline" size="icon-sm" disabled={busy} onClick={() => setEditOpen(true)} aria-label="Edit action"><Pencil className="size-3.5" /></Button>
                        <Button type="button" variant="outline" size="icon-sm" disabled={busy} onClick={() => { setOperation("cancel"); setReason(""); }} aria-label="Cancel action"><Trash2 className="size-3.5" /></Button>
                        {(reminderDateTarget || action.target_mileage !== null || action.reminder.enabled) && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setOperation("reminder")}>Reminder</Button>}
                        {action.reminder_due && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onDismissReminder}>Dismiss reminder</Button>}
                    </>}
                    {action.status === "SKIPPED" && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRestore}>Restore</Button>}
                    {proposed && <Button type="button" variant="outline" size="icon-sm" disabled={busy} onClick={() => setEditOpen(true)} aria-label="Edit proposal"><Pencil className="size-3.5" /></Button>}
                </div>
            </CardContent>
        </Card>

        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
            <SheetContent side="right" className="w-[min(100vw,36rem)] overflow-y-auto border-white/10 bg-[#151719] text-white">
                <SheetHeader><SheetTitle>{action.title}</SheetTitle><SheetDescription className="text-white/55">Action details, provenance, and status history.</SheetDescription></SheetHeader>
                <div className="space-y-5 px-5 pb-6">
                    <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-white/45">Status</p><p className="mt-1">{STATUS_LABELS[action.status]}</p></div><div><p className="text-xs text-white/45">Priority</p><p className="mt-1">{action.priority.toLowerCase()}</p></div><div><p className="text-xs text-white/45">Action source</p><p className="mt-1">{action.recommendation_source.replaceAll("_", " ").toLowerCase()}</p></div><div><p className="text-xs text-white/45">Trigger</p><p className="mt-1">{action.trigger_basis.toLowerCase()}</p></div></div>
                    {action.description && <section><h4 className="text-xs font-semibold uppercase tracking-wide text-white/45">Description</h4><p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{action.description}</p></section>}
                    {(targetLabel || action.scheduled_date) && <section><h4 className="text-xs font-semibold uppercase tracking-wide text-white/45">Schedule</h4><p className="mt-2 text-sm text-white/75">{targetLabel || "No due target"}{action.scheduled_date ? ` · Appointment ${formatDate(action.scheduled_date)}` : ""}</p>{action.target_date_estimated && <p className="mt-1 text-xs text-white/45">Calendar date projected from the monthly mileage estimate entered for this plan.</p>}</section>}
                    {action.source_references.length > 0 && <section className="space-y-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-white/45">Research references</h4><p className="text-xs text-amber-100/70">These excerpts were source-matched in Phase 3 research, but are not independently verified technical instructions. Review the source before acting.</p>{action.source_references.map((source, index) => <div key={`${source.url}-${index}`} className="rounded-xl border border-white/10 p-3"><a href={source.url ?? undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-red-200 underline-offset-4 hover:underline">{source.title ?? source.url}<ExternalLink className="size-3" /></a>{source.excerpt && <blockquote className="mt-2 border-l-2 border-red-400/50 pl-3 text-xs text-white/65">{source.excerpt}</blockquote>}</div>)}</section>}
                    {action.work_performed && <section><h4 className="text-xs font-semibold uppercase tracking-wide text-white/45">Completed work</h4><p className="mt-2 text-sm">{action.work_performed}</p>{action.service_provider && <p className="mt-1 text-xs text-white/55">{action.service_provider}</p>}{action.actual_cost !== null && <p className="mt-1 text-xs text-white/55">Actual cost RM {action.actual_cost.toFixed(2)}</p>}{action.component_replaced && <p className="mt-1 text-xs text-emerald-200">Owner confirmed component replacement.</p>}</section>}
                    {action.service_visit_id && <p className="text-xs text-white/50">Linked service record: {action.service_visit_id}</p>}
                    {action.notes && <section><h4 className="text-xs font-semibold uppercase tracking-wide text-white/45">Personal notes</h4><p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{action.notes}</p></section>}
                    {action.skip_reason && <section><h4 className="text-xs font-semibold uppercase tracking-wide text-white/45">Skip reason</h4><p className="mt-2 text-sm">{action.skip_reason}</p></section>}
                    <section><h4 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/45"><History className="size-3.5" /> Status history</h4><ol className="mt-2 space-y-2 border-l border-white/10 pl-4">{action.status_history.map((event, index) => <li key={`${event.status}-${event.changed_at}-${index}`} className="text-xs"><p className="font-medium text-white/75">{event.status.replaceAll("_", " ").toLowerCase()}</p><p className="text-white/45">{new Date(event.changed_at).toLocaleString("en-MY")}{event.reason ? ` · ${event.reason}` : ""}</p></li>)}</ol></section>
                </div>
            </SheetContent>
        </Sheet>

        <MaintenanceActionFormDialog key={`${action.id}:${editOpen}`} open={editOpen} onOpenChange={setEditOpen} action={action} busy={busy} onCreate={async () => undefined} onUpdate={onEdit} />

        <Dialog open={operation !== null} onOpenChange={(open) => { if (!open) setOperation(null); }}>
            <DialogContent className="border-white/10 bg-[#151719] text-white sm:max-w-md">
                {operation === "reschedule" ? <>
                    <DialogHeader><DialogTitle>Reschedule action</DialogTitle><DialogDescription className="text-white/55">Keep the target date, mileage, or both. SmartDrive records the reason and does not change the original service record.</DialogDescription></DialogHeader>
                    <form className="space-y-4" onSubmit={submitOperation}>
                        <div className="space-y-2"><Label htmlFor="reschedule-target-date">New target date</Label><Input id="reschedule-target-date" className={controlClass} type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="reschedule-target-mileage">New target mileage (km)</Label><Input id="reschedule-target-mileage" className={controlClass} type="number" min="0" value={targetMileage} onChange={(event) => setTargetMileage(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="reschedule-appointment-date">Scheduled appointment date (optional)</Label><Input id="reschedule-appointment-date" className={controlClass} type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="reschedule-reason">Reason</Label><Textarea id="reschedule-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setOperation(null)}>Cancel</Button><Button type="submit" disabled={busy || (!targetDate && !targetMileage && !scheduledDate) || !reason.trim()} className="bg-red-600 text-white hover:bg-red-500">Save reschedule</Button></DialogFooter>
                    </form>
                </> : operation === "skip" || operation === "cancel" ? <>
                    <DialogHeader><DialogTitle>{operation === "skip" ? "Skip this action?" : "Cancel this action?"}</DialogTitle><DialogDescription className="text-white/55">The action stays in the plan history. This will not change the saved maintenance schedule.</DialogDescription></DialogHeader>
                    <form className="space-y-4" onSubmit={submitOperation}><div className="space-y-2"><Label htmlFor="action-operation-reason">Reason</Label><Textarea id="action-operation-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOperation(null)}>Keep action</Button><Button type="submit" disabled={busy || !reason.trim()} className="bg-red-600 text-white hover:bg-red-500">{operation === "skip" ? "Skip action" : "Cancel action"}</Button></DialogFooter></form>
                </> : operation === "reminder" ? <>
                    <DialogHeader><DialogTitle>Reminder settings</DialogTitle><DialogDescription className="text-white/55">SmartDrive checks these thresholds when the planner loads. No email, push, or background delivery is configured.</DialogDescription></DialogHeader>
                    <form className="space-y-4" onSubmit={submitOperation}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} className="accent-red-500" />Enable in-app reminder</label><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="reminder-days">Days before</Label><Input id="reminder-days" className={controlClass} type="number" min="0" max="365" disabled={!reminderDateTarget} value={advanceDays} onChange={(event) => setAdvanceDays(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="reminder-km">Kilometres before</Label><Input id="reminder-km" className={controlClass} type="number" min="0" max="100000" disabled={action.target_mileage === null} value={advanceKm} onChange={(event) => setAdvanceKm(event.target.value)} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOperation(null)}>Cancel</Button><Button type="submit" disabled={busy || (reminderEnabled && ((!reminderDateTarget || !advanceDays) && (action.target_mileage === null || !advanceKm)))} className="bg-red-600 text-white hover:bg-red-500">Save reminder</Button></DialogFooter></form>
                </> : null}
            </DialogContent>
        </Dialog>
    </>;
}
