import { useRef, useState } from "react";
import { Loader2, Plus, ScanLine, Trash2, Wrench } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/shared/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import {
    serviceVisitSchema,
    type ServiceVisitFormValues,
} from "../validation/maintenaceSchemas";

import { useCreateServiceVisit } from "../hooks/useMaintenance";

import type { MaintenanceType } from "../types/maintenance";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { receiptApi } from "@/features/receipts/api/receiptApi";
import { receiptUploadSchema } from "@/features/receipts/validation/receiptSchema";
import { toast } from "@/shared/components/ui/toast";


interface AddMaintenanceDialogProps {
    vehicleId: string;
}


const maintenanceTypes: {
    value: MaintenanceType;
    label: string;
}[] = [
    {
        value: "ENGINE_OIL",
        label: "Engine Oil",
    },
    {
        value: "OIL_FILTER",
        label: "Oil Filter",
    },
    {
        value: "AIR_FILTER",
        label: "Air Filter",
    },
    {
        value: "CABIN_FILTER",
        label: "Cabin Filter",
    },
    {
        value: "BRAKE_SERVICE",
        label: "Brake Service",
    },
    {
        value: "BRAKE_FLUID",
        label: "Brake Fluid",
    },
    {
        value: "COOLANT",
        label: "Coolant",
    },
    {
        value: "TRANSMISSION",
        label: "Transmission",
    },
    {
        value: "BATTERY",
        label: "Battery",
    },
    {
        value: "TYRE",
        label: "Tyre",
    },
    {
        value: "ALIGNMENT",
        label: "Wheel Alignment",
    },
    {
        value: "SPARK_PLUG",
        label: "Spark Plugs",
    },
    {
        value: "TIMING_BELT",
        label: "Timing Belt",
    },
    {
        value: "INSPECTION",
        label: "Inspection",
    },
    {
        value: "OTHER",
        label: "Other",
    },
];


const defaultItem = {
    type: "ENGINE_OIL" as MaintenanceType,
    description: "",
    next_due_date: "",
    next_due_mileage: undefined,
    cost: undefined,
    notes: "",
};


export function AddMaintenanceDialog({
    vehicleId,
}: AddMaintenanceDialogProps) {
    const [open, setOpen] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [scanning, setScanning] = useState(false);
    const [savedVisitId, setSavedVisitId] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const receiptInputRef = useRef<HTMLInputElement>(null);

    const createServiceVisit = useCreateServiceVisit();

    const form = useForm<ServiceVisitFormValues>({
        resolver: zodResolver(serviceVisitSchema),
        defaultValues: {
            service_date: "",
            mileage_at_service: 0,
            workshop: "",
            notes: "",
            items: [defaultItem],
        },
    });

    const {
        register,
        control,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = form;

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items",
    });

    const resetVisitDraft = () => {
        reset({
            service_date: "",
            mileage_at_service: 0,
            workshop: "",
            notes: "",
            items: [defaultItem],
        });
        setReceiptFile(null);
        setSavedVisitId(null);
        setScanError(null);
        if (receiptInputRef.current) receiptInputRef.current.value = "";
    };


    const onSubmit = async (values: ServiceVisitFormValues) => {
        if (receiptFile) {
            const validation = receiptUploadSchema.safeParse({ file: receiptFile });
            if (!validation.success) {
                setScanError(validation.error.issues[0]?.message ?? "Choose a supported receipt file.");
                return;
            }
        }
        try {
            let serviceVisitId = savedVisitId;
            if (!serviceVisitId) {
                const created = await createServiceVisit.mutateAsync({
                vehicle_id: vehicleId,

                service_date: values.service_date,
                mileage_at_service: values.mileage_at_service,

                workshop: values.workshop || null,
                notes: values.notes || null,

                items: values.items.map((item) => ({
                    type: item.type,

                    description: item.description || null,

                    next_due_date:
                        item.next_due_date || null,

                    next_due_mileage:
                        item.next_due_mileage ?? null,

                    cost:
                        item.cost ?? null,

                    notes:
                        item.notes || null,
                })),
                });
                serviceVisitId = created.id;
                setSavedVisitId(serviceVisitId);
            }

            if (receiptFile && serviceVisitId) {
                try {
                    await receiptApi.create({
                        vehicleId,
                        serviceVisitId,
                        file: receiptFile,
                    });
                } catch {
                    toast.add({
                        title: "Service saved; receipt needs retry",
                        description: "The service visit was saved. Submit again to retry attaching its receipt.",
                        type: "error",
                    });
                    return;
                }
            }

            resetVisitDraft();
            setOpen(false);
        } catch {
            // The mutation hook handles the error state/toast.
        }
    };

    const handleScanReceipt = async () => {
        if (!receiptFile) return;
        const validation = receiptUploadSchema.safeParse({ file: receiptFile });
        if (!validation.success) {
            setScanError(validation.error.issues[0]?.message ?? "Choose a supported receipt file.");
            return;
        }
        setScanning(true);
        setScanError(null);
        try {
            const draft = await receiptApi.scan(receiptFile);
            setValue("service_date", draft.service_date ?? "", { shouldValidate: true });
            setValue("mileage_at_service", draft.mileage_at_service ?? Number.NaN, { shouldValidate: true });
            setValue("workshop", draft.workshop ?? "", { shouldValidate: true });
            replace(draft.items.length
                ? draft.items.map((item) => ({
                    type: item.type,
                    description: item.description,
                    next_due_date: "",
                    next_due_mileage: undefined,
                    cost: item.cost ?? undefined,
                    notes: "",
                }))
                : [{ ...defaultItem, type: "OTHER" as MaintenanceType }]);
        } catch (error: any) {
            setScanError(error.response?.data?.detail ?? "Could not scan this receipt. Try a clearer image or PDF.");
        } finally {
            setScanning(false);
        }
    };


    const handleOpenChange = (value: boolean) => {
        setOpen(value);

        if (!value) {
            resetVisitDraft();
        }
    };


    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button>
                        <Plus className="size-4" />
                        Add Service
                    </Button>
                }
            />

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>
                        Add Service Visit
                    </DialogTitle>

                    <DialogDescription>
                        Record a completed service and the maintenance items
                        performed during the visit.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                    <form
                        onSubmit={savedVisitId
                            ? (event) => {
                                event.preventDefault();
                                void onSubmit(form.getValues());
                            }
                            : handleSubmit(onSubmit)}
                        className="space-y-6"
                    >

                        <div className="space-y-3 rounded-xl border border-dashed p-4">
                            <div>
                                <h3 className="font-semibold">Scan a Receipt</h3>
                                <p className="text-sm text-muted-foreground">Choose a receipt image or PDF to prefill this editable service visit.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <Input
                                    ref={receiptInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                                    disabled={Boolean(savedVisitId)}
                                    onChange={(event) => {
                                        setReceiptFile(event.target.files?.[0] ?? null);
                                        setScanError(null);
                                    }}
                                    className="max-w-md"
                                />
                                <Button type="button" variant="outline" onClick={handleScanReceipt} disabled={!receiptFile || scanning || Boolean(savedVisitId)}>
                                    {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
                                    {scanning ? "Scanning..." : "Scan receipt"}
                                </Button>
                            </div>
                            {receiptFile && <p className="text-xs text-muted-foreground">Selected: {receiptFile.name}</p>}
                            {scanError && <p className="text-sm text-destructive">{scanError}</p>}
                            {savedVisitId && <p className="text-sm text-amber-700">The service visit is saved. Submit again to retry attaching the selected receipt.</p>}
                        </div>

                        <fieldset disabled={Boolean(savedVisitId)} className="space-y-6">

                        {/* =====================================================
                            Service Visit
                        ====================================================== */}

                        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                            <div>
                                <h3 className="font-semibold">
                                    Service Visit
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Information shared by all maintenance items
                                    performed during this visit.
                                </p>
                            </div>


                            <div className="grid gap-4 sm:grid-cols-2">

                                {/* Service Date */}

                                <div className="space-y-2">
                                    <Label htmlFor="service_date">
                                        Service Date
                                    </Label>

                                    <Input
                                        id="service_date"
                                        type="date"
                                        {...register("service_date")}
                                    />

                                    {errors.service_date && (
                                        <p className="text-sm text-destructive">
                                            {errors.service_date.message}
                                        </p>
                                    )}
                                </div>


                                {/* Mileage */}

                                <div className="space-y-2">
                                    <Label htmlFor="mileage_at_service">
                                        Mileage
                                    </Label>

                                    <Input
                                        id="mileage_at_service"
                                        type="number"
                                        min="0"
                                        {...register(
                                            "mileage_at_service",
                                            {
                                                valueAsNumber: true,
                                            }
                                        )}
                                    />

                                    {errors.mileage_at_service && (
                                        <p className="text-sm text-destructive">
                                            {
                                                errors
                                                    .mileage_at_service
                                                    .message
                                            }
                                        </p>
                                    )}
                                </div>

                            </div>


                            {/* Workshop */}

                            <div className="space-y-2">
                                <Label htmlFor="workshop">
                                    Workshop
                                </Label>

                                <Input
                                    id="workshop"
                                    placeholder="e.g. ABC Auto Service"
                                    {...register("workshop")}
                                />

                                {errors.workshop && (
                                    <p className="text-sm text-destructive">
                                        {errors.workshop.message}
                                    </p>
                                )}
                            </div>


                            {/* Visit Notes */}

                            <div className="space-y-2">
                                <Label htmlFor="visit_notes">
                                    Visit Notes
                                </Label>

                                <Textarea
                                    id="visit_notes"
                                    placeholder="General notes about this service visit..."
                                    {...register("notes")}
                                />

                                {errors.notes && (
                                    <p className="text-sm text-destructive">
                                        {errors.notes.message}
                                    </p>
                                )}
                            </div>
                        </div>


                        {/* =====================================================
                            Maintenance Items
                        ====================================================== */}

                        <div className="space-y-4">

                            <div className="flex items-start justify-between gap-4">

                                <div>
                                    <h3 className="font-semibold">
                                        Maintenance Items
                                    </h3>

                                    <p className="text-sm text-muted-foreground">
                                        Add everything that was serviced during
                                        this visit.
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        append({
                                            ...defaultItem,
                                        })
                                    }
                                >
                                    <Plus className="size-4" />
                                    Add Item
                                </Button>

                            </div>


                            {/* Items */}

                            <div className="space-y-4">

                                {fields.map((field, index) => {

                                    const itemErrors =
                                        errors.items?.[index];

                                    const selectedType =
                                        watch(
                                            `items.${index}.type`
                                        );

                                    return (
                                        <div
                                            key={field.id}
                                            className="space-y-5 rounded-xl border p-4"
                                        >

                                            {/* Item Header */}

                                            <div className="flex items-center justify-between gap-3">

                                                <div className="flex items-center gap-2">

                                                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                                                        <Wrench className="size-4" />
                                                    </div>

                                                    <div>
                                                        <p className="font-medium">
                                                            Maintenance Item{" "}
                                                            {index + 1}
                                                        </p>

                                                        <p className="text-xs text-muted-foreground">
                                                            Configure this item's
                                                            service interval
                                                        </p>
                                                    </div>

                                                </div>


                                                {fields.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive"
                                                        onClick={() =>
                                                            remove(index)
                                                        }
                                                        aria-label={`Remove maintenance item ${index + 1}`}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}

                                            </div>


                                            {/* Type + Cost */}

                                            <div className="grid gap-4 sm:grid-cols-2">

                                                {/* Type */}

                                                <div className="space-y-2">
                                                    <Label>
                                                        Maintenance Type
                                                    </Label>

                                                    <Select
                                                        value={selectedType}
                                                        onValueChange={(value) =>
                                                            setValue(
                                                                `items.${index}.type`,
                                                                value as MaintenanceType,
                                                                {
                                                                    shouldValidate:
                                                                        true,
                                                                }
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select maintenance type" />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            {maintenanceTypes.map(
                                                                (type) => (
                                                                    <SelectItem
                                                                        key={
                                                                            type.value
                                                                        }
                                                                        value={
                                                                            type.value
                                                                        }
                                                                    >
                                                                        {
                                                                            type.label
                                                                        }
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>

                                                    {itemErrors?.type && (
                                                        <p className="text-sm text-destructive">
                                                            {
                                                                itemErrors.type
                                                                    .message
                                                            }
                                                        </p>
                                                    )}
                                                </div>


                                                {/* Cost */}

                                                <div className="space-y-2">
                                                    <Label
                                                        htmlFor={`items.${index}.cost`}
                                                    >
                                                        Cost
                                                    </Label>

                                                    <Input
                                                        id={`items.${index}.cost`}
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        {...register(`items.${index}.cost`, {
                                                            setValueAs: (value) =>
                                                                value === "" ? undefined : Number(value),
                                                        })}
                                                    />

                                                    {itemErrors?.cost && (
                                                        <p className="text-sm text-destructive">
                                                            {
                                                                itemErrors.cost
                                                                    .message
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                            </div>


                                            {/* Description */}

                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor={`items.${index}.description`}
                                                >
                                                    Description
                                                </Label>

                                                <Input
                                                    id={`items.${index}.description`}
                                                    placeholder="e.g. Fully synthetic 5W-30"
                                                    {...register(
                                                        `items.${index}.description`
                                                    )}
                                                />

                                                {itemErrors?.description && (
                                                    <p className="text-sm text-destructive">
                                                        {
                                                            itemErrors.description
                                                                .message
                                                        }
                                                    </p>
                                                )}
                                            </div>


                                            {/* Next Due */}

                                            <div className="space-y-3">

                                                <div>
                                                    <Label>
                                                        Next Service
                                                    </Label>

                                                    <p className="text-xs text-muted-foreground">
                                                        Leave either field empty if
                                                        there is no scheduled next
                                                        service.
                                                    </p>
                                                </div>


                                                <div className="grid gap-4 sm:grid-cols-2">

                                                    {/* Date */}

                                                    <div className="space-y-2">
                                                        <Label
                                                            htmlFor={`items.${index}.next_due_date`}
                                                            className="text-sm font-normal text-muted-foreground"
                                                        >
                                                            Due Date
                                                        </Label>

                                                        <Input
                                                            id={`items.${index}.next_due_date`}
                                                            type="date"
                                                            {...register(
                                                                `items.${index}.next_due_date`
                                                            )}
                                                        />

                                                        {itemErrors?.next_due_date && (
                                                            <p className="text-sm text-destructive">
                                                                {
                                                                    itemErrors
                                                                        .next_due_date
                                                                        .message
                                                                }
                                                            </p>
                                                        )}
                                                    </div>


                                                    {/* Mileage */}

                                                    <div className="space-y-2">
                                                        <Label
                                                            htmlFor={`items.${index}.next_due_mileage`}
                                                            className="text-sm font-normal text-muted-foreground"
                                                        >
                                                            Due Mileage
                                                        </Label>

                                                        <Input
                                                            id={`items.${index}.next_due_mileage`}
                                                            type="number"
                                                            min="0"
                                                            placeholder="e.g. 60000"
                                                            {...register(
                                                                `items.${index}.next_due_mileage`,
                                                                {
                                                                    setValueAs: (value) =>
                                                                        value === "" ? undefined : Number(value),
                                                                }
                                                            )}
                                                        />

                                                        {itemErrors?.next_due_mileage && (
                                                            <p className="text-sm text-destructive">
                                                                {
                                                                    itemErrors
                                                                        .next_due_mileage
                                                                        .message
                                                                }
                                                            </p>
                                                        )}
                                                    </div>

                                                </div>

                                            </div>


                                            {/* Item Notes */}

                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor={`items.${index}.notes`}
                                                >
                                                    Item Notes
                                                </Label>

                                                <Textarea
                                                    id={`items.${index}.notes`}
                                                    placeholder="Additional notes for this maintenance item..."
                                                    {...register(
                                                        `items.${index}.notes`
                                                    )}
                                                />

                                                {itemErrors?.notes && (
                                                    <p className="text-sm text-destructive">
                                                        {
                                                            itemErrors.notes
                                                                .message
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                        </div>
                                    );
                                })}

                            </div>


                            {/* Array error */}

                            {typeof errors.items?.message === "string" && (
                                <p className="text-sm text-destructive">
                                    {errors.items.message}
                                </p>
                            )}

                        </div>


                        </fieldset>

                        {/* =====================================================
                            Footer
                        ====================================================== */}

                        <DialogFooter>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={createServiceVisit.isPending || scanning}
                            >
                                {createServiceVisit.isPending
                                    ? "Saving..."
                                    : savedVisitId ? "Retry receipt attachment" : "Save Service"}
                            </Button>

                        </DialogFooter>

                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
