import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";

import { toast } from "@/shared/components/ui/toast";
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
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import { useUpdateMaintenance } from "../hooks/useMaintenance";

import type {
    MaintenanceListItem,
    MaintenanceType,
} from "../types/maintenance";

import {
    maintenanceItemSchema,
    type MaintenanceItemFormValues,
} from "../validation/maintenaceSchemas";

interface EditMaintenanceDialogProps {
    maintenance: MaintenanceListItem;
}

export function EditMaintenanceDialog({
    maintenance,
}: EditMaintenanceDialogProps) {
    const [open, setOpen] = useState(false);

    const updateMaintenance = useUpdateMaintenance();

    const form = useForm<MaintenanceItemFormValues>({
        resolver: zodResolver(maintenanceItemSchema),
        defaultValues: {
            type: maintenance.type,
            description: maintenance.description ?? "",
            next_due_date: maintenance.next_due_date ?? "",
            next_due_mileage:
                maintenance.next_due_mileage ?? undefined,
            cost: maintenance.cost ?? undefined,
            notes: maintenance.notes ?? "",
        },
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.reset({
            type: maintenance.type,
            description: maintenance.description ?? "",
            next_due_date: maintenance.next_due_date ?? "",
            next_due_mileage:
                maintenance.next_due_mileage ?? undefined,
            cost: maintenance.cost ?? undefined,
            notes: maintenance.notes ?? "",
        });
    }, [open, maintenance, form]);

    const onSubmit = async (
        values: MaintenanceItemFormValues,
    ) => {
        try {
            await updateMaintenance.mutateAsync({
                maintenanceId: maintenance.id,

                maintenance: {
                    type: values.type,

                    description:
                        values.description || null,

                    next_due_date:
                        values.next_due_date || null,

                    next_due_mileage:
                        values.next_due_mileage ?? null,

                    cost:
                        values.cost ?? null,

                    notes:
                        values.notes || null,
                },
            });

            toast.add({
                title: "Maintenance updated",
                description:
                    "The maintenance item has been updated successfully.",
                type: "success",
            });

            setOpen(false);
        } catch (error) {
            let message =
                "Unable to update the maintenance item. Please try again.";

            if (isAxiosError(error)) {
                const detail =
                    error.response?.data?.detail;

                if (typeof detail === "string") {
                    message = detail;
                }
            }

            toast.add({
                title: "Failed to update maintenance",
                description: message,
                type: "error",
            });
        }
    };

    const handleOpenChange = (value: boolean) => {
        if (!updateMaintenance.isPending) {
            setOpen(value);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit maintenance"
                    >
                        <Pencil className="size-4" />
                    </Button>
                }
            />

            <DialogContent className="max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>
                        Edit Maintenance
                    </DialogTitle>

                    <DialogDescription>
                        Update this maintenance item and
                        its next service interval.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        {/* ====================================================
                            Maintenance Item
                        ==================================================== */}

                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Maintenance Item
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Update the maintenance that was
                                    performed.
                                </p>
                            </div>

                            {/* Maintenance Type */}

                            <FormField
                                label="Maintenance Type"
                                error={
                                    form.formState.errors.type?.message
                                }
                            >
                                <Select
                                    value={form.watch("type")}
                                    onValueChange={(value) =>
                                        form.setValue(
                                            "type",
                                            value as MaintenanceType,
                                            {
                                                shouldValidate: true,
                                            },
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="ENGINE_OIL">
                                            Engine Oil
                                        </SelectItem>

                                        <SelectItem value="OIL_FILTER">
                                            Oil Filter
                                        </SelectItem>

                                        <SelectItem value="AIR_FILTER">
                                            Air Filter
                                        </SelectItem>

                                        <SelectItem value="CABIN_FILTER">
                                            Cabin Filter
                                        </SelectItem>

                                        <SelectItem value="BRAKE_SERVICE">
                                            Brake Service
                                        </SelectItem>

                                        <SelectItem value="BRAKE_FLUID">
                                            Brake Fluid
                                        </SelectItem>

                                        <SelectItem value="COOLANT">
                                            Coolant
                                        </SelectItem>

                                        <SelectItem value="TRANSMISSION">
                                            Transmission
                                        </SelectItem>

                                        <SelectItem value="BATTERY">
                                            Battery
                                        </SelectItem>

                                        <SelectItem value="TYRE">
                                            Tyre
                                        </SelectItem>

                                        <SelectItem value="ALIGNMENT">
                                            Alignment
                                        </SelectItem>

                                        <SelectItem value="SPARK_PLUG">
                                            Spark Plug
                                        </SelectItem>

                                        <SelectItem value="TIMING_BELT">
                                            Timing Belt
                                        </SelectItem>

                                        <SelectItem value="INSPECTION">
                                            Inspection
                                        </SelectItem>

                                        <SelectItem value="OTHER">
                                            Other
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>

                            {/* Description */}

                            <FormField
                                label="Description"
                                error={
                                    form.formState.errors
                                        .description?.message
                                }
                            >
                                <Input
                                    placeholder="e.g. Fully synthetic 5W-30"
                                    {...form.register(
                                        "description",
                                    )}
                                />
                            </FormField>
                        </section>

                        {/* ====================================================
                            Next Service
                        ==================================================== */}

                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Next Service
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Leave either field empty if
                                    there is no scheduled next service.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Due Date */}

                                <FormField
                                    label="Due Date"
                                    error={
                                        form.formState.errors
                                            .next_due_date?.message
                                    }
                                >
                                    <Input
                                        type="date"
                                        {...form.register(
                                            "next_due_date",
                                        )}
                                    />
                                </FormField>

                                {/* Due Mileage */}

                                <FormField
                                    label="Due Mileage (km)"
                                    error={
                                        form.formState.errors
                                            .next_due_mileage?.message
                                    }
                                >
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="e.g. 60000"
                                        {...form.register(
                                            "next_due_mileage",
                                            {
                                                setValueAs: (
                                                    value,
                                                ) =>
                                                    value === ""
                                                        ? undefined
                                                        : Number(value),
                                            },
                                        )}
                                    />
                                </FormField>
                            </div>
                        </section>

                        {/* ====================================================
                            Cost
                        ==================================================== */}

                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Cost
                                </h3>
                            </div>

                            <FormField
                                label="Cost (RM)"
                                error={
                                    form.formState.errors
                                        .cost?.message
                                }
                            >
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    {...form.register("cost", {
                                        setValueAs: (
                                            value,
                                        ) =>
                                            value === ""
                                                ? undefined
                                                : Number(value),
                                    })}
                                />
                            </FormField>
                        </section>

                        {/* ====================================================
                            Notes
                        ==================================================== */}

                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Additional Information
                                </h3>
                            </div>

                            <FormField
                                label="Notes"
                                error={
                                    form.formState.errors
                                        .notes?.message
                                }
                            >
                                <Textarea
                                    className="min-h-24"
                                    placeholder="Additional notes for this maintenance item..."
                                    {...form.register("notes")}
                                />
                            </FormField>
                        </section>

                        {/* ====================================================
                            Footer
                        ==================================================== */}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    updateMaintenance.isPending
                                }
                                onClick={() =>
                                    handleOpenChange(false)
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={
                                    updateMaintenance.isPending
                                }
                            >
                                {updateMaintenance.isPending && (
                                    <Loader2 className="animate-spin" />
                                )}

                                {updateMaintenance.isPending
                                    ? "Saving..."
                                    : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}


/* ================================================================
   Form Field
================================================================ */

interface FormFieldProps {
    label: string;
    error?: string;
    children: React.ReactNode;
}

function FormField({
    label,
    error,
    children,
}: FormFieldProps) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>

            {children}

            {error && (
                <p className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}