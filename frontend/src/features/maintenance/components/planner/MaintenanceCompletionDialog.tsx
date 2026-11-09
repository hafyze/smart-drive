import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import type { CompleteActionPayload, MaintenancePlanAction } from "../../types/maintenancePlan";

const controlClass = "h-10 w-full rounded-lg border border-white/15 bg-[#111315] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-red-400";
function localDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function MaintenanceCompletionDialog({
    action, currentMileage, open, onOpenChange, busy, onComplete,
}: {
    action: MaintenancePlanAction | null;
    currentMileage: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    busy: boolean;
    onComplete: (payload: CompleteActionPayload) => Promise<void>;
}) {
    const [confirmRecord, setConfirmRecord] = useState(false);
    const [completionDate, setCompletionDate] = useState(localDate());
    const [mileage, setMileage] = useState(String(currentMileage));
    const [work, setWork] = useState("");
    const [provider, setProvider] = useState("");
    const [cost, setCost] = useState("");
    const [notes, setNotes] = useState("");
    const [nextDate, setNextDate] = useState("");
    const [nextMileage, setNextMileage] = useState("");
    const [componentReplaced, setComponentReplaced] = useState(false);

    const resetForm = () => {
        setConfirmRecord(false);
        setCompletionDate(localDate());
        setMileage(String(currentMileage));
        setWork(action?.title ?? "");
        setProvider(""); setCost(""); setNotes(""); setNextDate(""); setNextMileage(""); setComponentReplaced(false);
    };

    const finish = async (createRecord: boolean) => {
        if (!action) return;
        try {
            await onComplete({
                completion_date: completionDate,
                actual_mileage: Number(mileage),
                work_performed: work,
                service_provider: provider || undefined,
                actual_cost: cost ? Number(cost) : undefined,
                notes: notes || undefined,
                component_replaced: componentReplaced,
                create_service_record: createRecord,
                next_due_date: nextDate || undefined,
                next_due_mileage: nextMileage ? Number(nextMileage) : undefined,
            });
        } catch {
            return;
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => { if (nextOpen) resetForm(); onOpenChange(nextOpen); }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#151719] text-white sm:max-w-xl">
                {!confirmRecord ? <>
                    <DialogHeader><DialogTitle>Complete maintenance</DialogTitle><DialogDescription className="text-white/55">Record only the work and mileage you confirm. No future interval or cost will be inferred.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label htmlFor="complete-date">Completion date</Label><Input id="complete-date" className={controlClass} type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="complete-mileage">Actual mileage (km)</Label><Input id="complete-mileage" className={controlClass} type="number" min={currentMileage} value={mileage} onChange={(event) => setMileage(event.target.value)} /></div>
                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="complete-work">Work performed</Label><Textarea id="complete-work" maxLength={500} required value={work} onChange={(event) => setWork(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="complete-provider">Service provider (optional)</Label><Input id="complete-provider" className={controlClass} maxLength={200} value={provider} onChange={(event) => setProvider(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="complete-cost">Actual cost (optional, RM)</Label><Input id="complete-cost" className={controlClass} type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="next-due-date">Next due date (optional)</Label><Input id="next-due-date" className={controlClass} type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="next-due-mileage">Next due mileage (optional)</Label><Input id="next-due-mileage" className={controlClass} type="number" min="0" value={nextMileage} onChange={(event) => setNextMileage(event.target.value)} /></div>
                        <p className="text-xs text-white/45 sm:col-span-2">If you leave next-due fields empty, the original saved schedule targets are retained. SmartDrive does not move them forward automatically.</p>
                        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={componentReplaced} onChange={(event) => setComponentReplaced(event.target.checked)} className="mt-1 accent-red-500" /><span>I confirm the component was replaced as part of this work.</span></label>
                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="complete-notes">Notes (optional)</Label><Textarea id="complete-notes" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
                    </div>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" disabled={!work.trim() || !mileage || Number(mileage) < currentMileage} onClick={() => setConfirmRecord(true)} className="bg-red-600 text-white hover:bg-red-500">Continue</Button></DialogFooter>
                </> : <>
                    <DialogHeader><DialogTitle>Create a service history record?</DialogTitle><DialogDescription className="text-white/55">You can link this confirmed completion to the vehicle’s existing service history. Choosing “No” still completes the planner action.</DialogDescription></DialogHeader>
                    <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm"><p className="font-medium">{action?.title}</p><p className="mt-1 text-white/55">{completionDate} · {Number(mileage).toLocaleString("en-MY")} km · {work}</p></div>
                    <DialogFooter className="sm:flex-wrap"><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmRecord(false)}>Back</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void finish(false)}>Complete without record</Button><Button type="button" disabled={busy} onClick={() => void finish(true)} className="bg-red-600 text-white hover:bg-red-500">{busy ? "Saving…" : "Create record and complete"}</Button></DialogFooter>
                </>}
            </DialogContent>
        </Dialog>
    );
}
