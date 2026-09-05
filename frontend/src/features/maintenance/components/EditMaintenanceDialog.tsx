import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";

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
import { toast } from "@/shared/components/ui/toast";

import { useUpdateServiceVisit } from "../hooks/useMaintenance";
import {
    serviceVisitSchema,
    type ServiceVisitFormValues,
} from "../validation/maintenaceSchemas";

import type {
    MaintenanceType,
    ServiceVisit,
} from "../types/maintenance";

interface EditMaintenanceDialogProps {
    serviceVisit: ServiceVisit;
}

const maintenanceTypes: {
    value: MaintenanceType;
    label: string;
}[] = [
    { value: "ENGINE_OIL", label: "Engine Oil" },
    { value: "OIL_FILTER", label: "Oil Filter" },
    { value: "AIR_FILTER", label: "Air Filter" },
    { value: "CABIN_FILTER", label: "Cabin Filter" },
    { value: "BRAKE_SERVICE", label: "Brake Service" },
    { value: "BRAKE_FLUID", label: "Brake Fluid" },
    { value: "COOLANT", label: "Coolant" },
    { value: "TRANSMISSION", label: "Transmission" },
    { value: "BATTERY", label: "Battery" },
    { value: "TYRE", label: "Tyre" },
    { value: "ALIGNMENT", label: "Wheel Alignment" },
    { value: "SPARK_PLUG", label: "Spark Plugs" },
    { value: "TIMING_BELT", label: "Timing Belt" },
    { value: "INSPECTION", label: "Inspection" },
    { value: "OTHER", label: "Other" },
];

const defaultItem = {
    type: "ENGINE_OIL" as MaintenanceType,
    description: "",
    next_due_date: "",
    next_due_mileage: undefined,
    cost: undefined,
    notes: "",
};

function toFormValues(
    serviceVisit: ServiceVisit,
): ServiceVisitFormValues {
    return {
        service_date: serviceVisit.service_date,
        mileage_at_service: serviceVisit.mileage_at_service,
        workshop: serviceVisit.workshop ?? "",
        notes: serviceVisit.notes ?? "",
        items: serviceVisit.items.map((item) => ({
            type: item.type,
            description: item.description ?? "",
            next_due_date: item.next_due_date ?? "",
            next_due_mileage:
                item.next_due_mileage ?? undefined,
            cost: item.cost ?? undefined,
            notes: item.notes ?? "",
        })),
    };
}

export function EditMaintenanceDialog({
    serviceVisit,
}: EditMaintenanceDialogProps) {
    const [open, setOpen] = useState(false);

    const updateServiceVisit = useUpdateServiceVisit();

    const form = useForm<ServiceVisitFormValues>({
        resolver: zodResolver(serviceVisitSchema),
        defaultValues: toFormValues(serviceVisit),
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

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    useEffect(() => {
        if (open) {
            reset(toFormValues(serviceVisit));
        }
    }, [open, serviceVisit, reset]);

    const onSubmit = async (
        values: ServiceVisitFormValues,
    ) => {
        try {
            await updateServiceVisit.mutateAsync({
                serviceVisitId: serviceVisit.id,
                serviceVisit: {
                    service_date: values.service_date,
                    mileage_at_service:
                        values.mileage_at_service,
                    workshop: values.workshop || null,
                    notes: values.notes || null,
                    items: values.items.map((item) => ({
                        type: item.type,
                        description:
                            item.description || null,
                        next_due_date:
                            item.next_due_date || null,
                        next_due_mileage:
                            item.next_due_mileage ?? null,
                        cost: item.cost ?? null,
                        notes: item.notes || null,
                    })),
                },
            });

            toast.add({
                title: "Service visit updated",
                description:
                    "The maintenance service visit has been updated successfully.",
                type: "success",
            });

            setOpen(false);
        } catch (error) {
            let message =
                "Unable to update the service visit. Please try again.";

            if (isAxiosError(error)) {
                const detail =
                    error.response?.data?.detail;

                if (typeof detail === "string") {
                    message = detail;
                }
            }

            toast.add({
                title: "Failed to update service visit",
                description: message,
                type: "error",
            });
        }
    };

    const handleOpenChange = (value: boolean) => {
        if (!updateServiceVisit.isPending) {
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
                        aria-label="Edit service visit"
                    >
                        <Pencil className="size-4" />
                    </Button>
                }
            />

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>
                        Edit Service Visit
                    </DialogTitle>

                    <DialogDescription>
                        Update the completed service and maintenance
                        items performed during the visit.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-6"
                >
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
                            <div className="space-y-2">
                                <Label htmlFor="edit_service_date">
                                    Service Date
                                </Label>

                                <Input
                                    id="edit_service_date"
                                    type="date"
                                    {...register("service_date")}
                                />

                                {errors.service_date && (
                                    <p className="text-sm text-destructive">
                                        {errors.service_date.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_mileage_at_service">
                                    Mileage
                                </Label>

                                <Input
                                    id="edit_mileage_at_service"
                                    type="number"
                                    min="0"
                                    {...register(
                                        "mileage_at_service",
                                        {
                                            valueAsNumber: true,
                                        },
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

                        <div className="space-y-2">
                            <Label htmlFor="edit_workshop">
                                Workshop
                            </Label>

                            <Input
                                id="edit_workshop"
                                placeholder="e.g. ABC Auto Service"
                                {...register("workshop")}
                            />

                            {errors.workshop && (
                                <p className="text-sm text-destructive">
                                    {errors.workshop.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_visit_notes">
                                Visit Notes
                            </Label>

                            <Textarea
                                id="edit_visit_notes"
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

                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const itemErrors =
                                    errors.items?.[index];

                                const selectedType = watch(
                                    `items.${index}.type`,
                                );

                                return (
                                    <div
                                        key={field.id}
                                        className="space-y-5 rounded-xl border p-4"
                                    >
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

                                        <div className="grid gap-4 sm:grid-cols-2">
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
                                                            },
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
                                                            ),
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

                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor={`edit_items.${index}.cost`}
                                                >
                                                    Cost
                                                </Label>

                                                <Input
                                                    id={`edit_items.${index}.cost`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    {...register(
                                                        `items.${index}.cost`,
                                                        {
                                                            setValueAs:
                                                                (value) =>
                                                                    value ===
                                                                    ""
                                                                        ? undefined
                                                                        : Number(
                                                                              value,
                                                                          ),
                                                        },
                                                    )}
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

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor={`edit_items.${index}.description`}
                                            >
                                                Description
                                            </Label>

                                            <Input
                                                id={`edit_items.${index}.description`}
                                                placeholder="e.g. Fully synthetic 5W-30"
                                                {...register(
                                                    `items.${index}.description`,
                                                )}
                                            />

                                            {itemErrors?.description && (
                                                <p className="text-sm text-destructive">
                                                    {
                                                        itemErrors
                                                            .description
                                                            .message
                                                    }
                                                </p>
                                            )}
                                        </div>

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
                                                <div className="space-y-2">
                                                    <Label
                                                        htmlFor={`edit_items.${index}.next_due_date`}
                                                        className="text-sm font-normal text-muted-foreground"
                                                    >
                                                        Due Date
                                                    </Label>

                                                    <Input
                                                        id={`edit_items.${index}.next_due_date`}
                                                        type="date"
                                                        {...register(
                                                            `items.${index}.next_due_date`,
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

                                                <div className="space-y-2">
                                                    <Label
                                                        htmlFor={`edit_items.${index}.next_due_mileage`}
                                                        className="text-sm font-normal text-muted-foreground"
                                                    >
                                                        Due Mileage
                                                    </Label>

                                                    <Input
                                                        id={`edit_items.${index}.next_due_mileage`}
                                                        type="number"
                                                        min="0"
                                                        placeholder="e.g. 60000"
                                                        {...register(
                                                            `items.${index}.next_due_mileage`,
                                                            {
                                                                setValueAs:
                                                                    (
                                                                        value,
                                                                    ) =>
                                                                        value ===
                                                                        ""
                                                                            ? undefined
                                                                            : Number(
                                                                                  value,
                                                                              ),
                                                            },
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

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor={`edit_items.${index}.notes`}
                                            >
                                                Item Notes
                                            </Label>

                                            <Textarea
                                                id={`edit_items.${index}.notes`}
                                                placeholder="Additional notes for this maintenance item..."
                                                {...register(
                                                    `items.${index}.notes`,
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

                        {typeof errors.items?.message ===
                            "string" && (
                            <p className="text-sm text-destructive">
                                {errors.items.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={updateServiceVisit.isPending}
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={updateServiceVisit.isPending}
                        >
                            {updateServiceVisit.isPending && (
                                <Loader2 className="animate-spin" />
                            )}

                            {updateServiceVisit.isPending
                                ? "Saving..."
                                : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
