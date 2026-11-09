import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import type { MaintenanceType } from "../../types/maintenance";
import type { ActionPriority, CreateUserActionPayload, MaintenancePlanAction, UpdateActionPayload } from "../../types/maintenancePlan";

const TYPES: Array<{ value: MaintenanceType; label: string }> = [
    { value: "ENGINE_OIL", label: "Engine oil" }, { value: "OIL_FILTER", label: "Oil filter" },
    { value: "AIR_FILTER", label: "Air filter" }, { value: "CABIN_FILTER", label: "Cabin filter" },
    { value: "BRAKE_SERVICE", label: "Brake service" }, { value: "BRAKE_FLUID", label: "Brake fluid" },
    { value: "COOLANT", label: "Coolant" }, { value: "TRANSMISSION", label: "Transmission" },
    { value: "BATTERY", label: "Battery" }, { value: "TYRE", label: "Tyres" },
    { value: "ALIGNMENT", label: "Alignment" }, { value: "SPARK_PLUG", label: "Spark plugs" },
    { value: "TIMING_BELT", label: "Timing belt" }, { value: "INSPECTION", label: "Inspection" },
    { value: "OTHER", label: "Other" },
];

const controlClass = "h-10 w-full rounded-lg border border-white/15 bg-[#111315] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-red-400";

export function MaintenanceActionFormDialog({
    open, onOpenChange, action, busy, onCreate, onUpdate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    action?: MaintenancePlanAction;
    busy: boolean;
    onCreate: (payload: CreateUserActionPayload) => Promise<void>;
    onUpdate: (payload: UpdateActionPayload) => Promise<void>;
}) {
    const [type, setType] = useState<MaintenanceType>("OTHER");
    const [category, setCategory] = useState("Other");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [targetMileage, setTargetMileage] = useState("");
    const [priority, setPriority] = useState<ActionPriority>("NORMAL");
    const [notes, setNotes] = useState("");

    const resetForm = () => {
        setType(action?.maintenance_type ?? "OTHER");
        setCategory(action?.category ?? "Other");
        setTitle(action?.title ?? "");
        setDescription(action?.description ?? "");
        setTargetDate((action?.target_date ?? "").slice(0, 10));
        setTargetMileage(action?.target_mileage?.toString() ?? "");
        setPriority(action?.priority ?? "NORMAL");
        setNotes(action?.notes ?? "");
    };

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            if (action) {
                await onUpdate({
                    title, category, description: description || null,
                    target_date: targetDate || null,
                    target_mileage: targetMileage ? Number(targetMileage) : null,
                    priority, notes: notes || null,
                });
            } else {
                await onCreate({
                    maintenance_type: type, category, title, description: description || undefined,
                    target_date: targetDate || undefined,
                    target_mileage: targetMileage ? Number(targetMileage) : undefined,
                    priority, notes: notes || undefined,
                });
            }
        } catch {
            return;
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => { if (nextOpen) resetForm(); onOpenChange(nextOpen); }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#151719] text-white sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{action ? "Edit maintenance action" : "Add personal maintenance"}</DialogTitle>
                    <DialogDescription className="text-white/55">Targets and priority are yours to set. SmartDrive will not estimate costs or create service records from this form.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={(event) => void submit(event)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {!action && <div className="space-y-2"><Label htmlFor="plan-action-type">Maintenance type</Label><select id="plan-action-type" className={controlClass} value={type} onChange={(event) => setType(event.target.value as MaintenanceType)}>{TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>}
                        <div className="space-y-2"><Label htmlFor="plan-action-category">Category</Label><Input id="plan-action-category" className={controlClass} maxLength={100} required value={category} onChange={(event) => setCategory(event.target.value)} /></div>
                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="plan-action-title">Action title</Label><Input id="plan-action-title" className={controlClass} maxLength={200} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Inspect front tyres" /></div>
                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="plan-action-description">Description</Label><Textarea id="plan-action-description" maxLength={1500} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="plan-action-date">Target date</Label><Input id="plan-action-date" className={controlClass} type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="plan-action-mileage">Target mileage (km)</Label><Input id="plan-action-mileage" className={controlClass} type="number" min="0" step="1" value={targetMileage} onChange={(event) => setTargetMileage(event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="plan-action-priority">Priority</Label><select id="plan-action-priority" className={controlClass} value={priority} onChange={(event) => setPriority(event.target.value as ActionPriority)}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option></select></div>
                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="plan-action-notes">Personal notes</Label><Textarea id="plan-action-notes" maxLength={1500} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={busy || !title.trim()} className="bg-red-600 text-white hover:bg-red-500">{busy ? "Saving…" : action ? "Save changes" : "Add proposed action"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
