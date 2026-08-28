import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
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

import { useCreateMaintenance } from "../hooks/useMaintenance";
import {
    maintenanceSchema,
    type MaintenanceFormValues,
} from "../validation/maintenaceSchemas";

interface AddMaintenanceDialogProps {
    vehicleId: string;
}

export function AddMaintenanceDialog({
    vehicleId,
}: AddMaintenanceDialogProps) {
    const [open, setOpen] = useState(false);

    const CreateMaintenance = useCreateMaintenance();

    const form = useForm<MaintenanceFormValues>({
        resolver: zodResolver(maintenanceSchema),
        defaultValues: {
            type: "ENGINE_OIL",
            description: "",
            service_date: "",
            mileage_at_service: 0,
            next_due_date: "",
            next_due_mileage: undefined,
            cost: undefined,
            workshop: "",
            notes: "",
        },
    });

    const onSubmit = async (values: MaintenanceFormValues) => {
        try {
            await CreateMaintenance.mutateAsync({
                vehicle_id: vehicleId,

                ...values,

                description: values.description || null,
                next_due_date: values.next_due_date || null,
                next_due_mileage: values.next_due_mileage ?? null,
                cost: values.cost ?? null,
                workshop: values.workshop || null,
                notes: values.notes || null,
            });

            toast.add({
                title: "Maintenance added",
                description: "The maintenance record has been added successfully.",
                type: "success",
            });

            form.reset();
            setOpen(false);
        } catch (error) {
            let message = "Unable to add the maintenance record. Please try again.";

            if (isAxiosError(error)) {
                const detail = error.response?.data?.detail;

                if (typeof detail === "string") {
                    message = detail;
                }
            }

            toast.add({
                title: "Failed to add maintenance.",
                description: message,
                type: "error",
            });
        }
    };

    const handleOpenChange = (value: boolean) => {
        if (!CreateMaintenance.isPending) {
            setOpen(value);

            if (!value) {
                form.reset();
            }
        }
    };

    interface FormFieldProps {
        label: string,
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

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogTrigger
                render={
                    <Button>
                        <Plus />
                        Add Maintenance
                    </Button>
                }
            />

            <DialogContent className="max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>
                        Add Maintenance
                    </DialogTitle>

                    <DialogDescription>
                        Add a maintenance record for this vehicle.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                        {/* Service info */}
                        <section>
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Service Information
                                </h3>
                                <p className="text-sm text-muted-foreground">Record what maintenance was performed</p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField label="Maintenance Type" error={form.formState.errors.type?.message}>
                                    <Select value={form.watch("type")} onValueChange={(value) =>
                                        form.setValue(
                                            "type",
                                            value as MaintenanceFormValues["type"],
                                            { shouldValidate: true },
                                        )
                                    }>
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

                                <FormField label="Service Date" error={form.formState.errors.service_date?.message}>
                                    <Input type="date" {...form.register("service_date")} />
                                </FormField>
                            </div>

                            <FormField
                                label="Description"
                                error={form.formState.errors.description?.message}
                            >
                                <Input
                                    placeholder="e.g. Engine oil and oil filter replacement"
                                    {...form.register("description")}
                                />
                            </FormField>

                            <FormField
                                label="Mileage at Service (km)"
                                error={form.formState.errors.mileage_at_service?.message}>
                                <Input
                                    type="number"
                                    min={0}
                                    {...form.register("mileage_at_service", { valueAsNumber: true })}
                                />
                            </FormField>
                        </section>
                            
                        {/* Next Service */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Next Service
                                </h3>
                                <p className="text-sm text-muted-foreground">Optional information about this service is due again.</p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField 
                                    label="Next Due Date" 
                                    error={form.formState.errors.next_due_date?.message}
                                >
                                    <Input type="date" {...form.register("next_due_date")}/>
                                </FormField>

                                <FormField 
                                    label="Next Due Mileage (km)" 
                                    error={form.formState.errors.next_due_mileage?.message}
                                >
                                    <Input 
                                        type="number" 
                                        min={0}
                                        {...form.register("next_due_mileage", {
                                            setValueAs: (value) =>
                                                value === "" ? undefined : Number(value),
                                        })}
                                    />
                                </FormField>
                            </div>
                        </section>

                        {/* Cost & Workshop */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold"></h3>

                                <p className="text-sm text-muted-foreground">
                                    Optional cost and workshop information.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField label="Cost (RM)" error={form.formState.errors.cost?.message}>
                                    <Input 
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        {...form.register("cost", {
                                            setValueAs: (value) =>
                                                value === "" ? undefined : Number(value),
                                        })}
                                    />
                                </FormField>

                                <FormField label="Workshop" error={form.formState.errors.workshop?.message}>
                                    <Input
                                        type="string"
                                        {...form.register("workshop")}    
                                    />
                                </FormField>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Additional Information
                                </h3>
                            </div>

                            <FormField label="Notes" error={form.formState.errors.notes?.message}>
                                <Textarea 
                                    placeholder="Anything you want to remember about this service..."
                                    className="min-h-24"
                                    {...form.register("notes")}
                                />
                            </FormField>
                        </section>

                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={CreateMaintenance.isPending} onClick={() => handleOpenChange(false)}>
                                Cancel
                            </Button>

                            <Button type="submit" disabled={CreateMaintenance.isPending}>
                                {CreateMaintenance.isPending && (
                                    <Loader2 className="animate-spin" />
                                )}

                                {CreateMaintenance.isPending
                                    ? "Adding..."
                                    : "Add Maintenance"}
                            </Button>
                        </DialogFooter>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}