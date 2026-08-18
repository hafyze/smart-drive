import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { ScrollArea, ScrollBar } from "@/shared/components/ui/scroll-area";
import { toast } from "@/shared/components/ui/toast";

import { useUpdateVehicle } from "../hooks/useVehicles";
import type { VehicleResponse } from "../types/vehicle";
import {
    vehicleUpdateSchema,
    type VehicleUpdateFormInput,
    type VehicleUpdateFormValues,
} from "../validation/vehicleSchema";

interface EditVehicleDialogProps {
    vehicle: VehicleResponse
}

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

export function EditVehicleDialog({
    vehicle,
}: EditVehicleDialogProps) {
    const [open, setOpen] = useState(false)

    const updateVehicle = useUpdateVehicle();

    const form = useForm<
        VehicleUpdateFormInput,
        undefined,
        VehicleUpdateFormValues
    >({
        resolver: zodResolver(vehicleUpdateSchema),
        defaultValues: {
            nickname: vehicle.nickname,
            manufacturer: vehicle.manufacturer,
            model: vehicle.model,
            variant: vehicle.variant,
            year: vehicle.year,
            current_mileage: vehicle.current_mileage,
            fuel_type: vehicle.fuel_type,
            transmission: vehicle.transmission,
            engine: vehicle.engine ?? "",
            plate_number: vehicle.plate_number ?? "",
            purchase_date: vehicle.purchase_date ?? "",
            vin: vehicle.vin ?? "",
            color: vehicle.color ?? "",
            photo_url: vehicle.photo_url ?? "",
            notes: vehicle.notes ?? "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                nickname: vehicle.nickname,
                manufacturer: vehicle.manufacturer,
                model: vehicle.model,
                variant: vehicle.variant,
                year: vehicle.year,
                current_mileage: vehicle.current_mileage,
                fuel_type: vehicle.fuel_type,
                transmission: vehicle.transmission,
                engine: vehicle.engine ?? "",
                plate_number: vehicle.plate_number ?? "",
                purchase_date: vehicle.purchase_date ?? "",
                vin: vehicle.vin ?? "",
                color: vehicle.color ?? "",
                photo_url: vehicle.photo_url ?? "",
                notes: vehicle.notes ?? "",
            })
        }
    }, [open, vehicle, form]);

    const onSubmit = async (
        values: VehicleUpdateFormValues,
    ) => {
        try{
            await updateVehicle.mutateAsync({
                vehicleId: vehicle.id,
                vehicle: {
                    ...values,
                    engine: values.engine || null,
                    plate_number: values.plate_number || null,
                    purchase_date: values.purchase_date || null,
                    vin: values.vin || null,
                    color: values.color || null,
                    photo_url: values.photo_url || null,
                    notes: values.notes || null,
                },
            });

            toast.add({
                title:"Vehicle updated",
                description: `${values.nickname ?? vehicle.nickname} has been updated.`,
                type: "success",
            });

            setOpen(false)
        }catch (error) {
            let message = "Unable to update the vehicle. Please try again";

            if (isAxiosError(error)) {
                const detail = error.response?.data?.detail;

                if (typeof detail === "string") {
                    message = detail
                }
            }

             toast.add({
                title: "Failed to update vehicle",
                description: message,
                type: "error",
            });
        }
    };
    const handleOpenChange = (value: boolean) => {
        if (!updateVehicle.isPending) {
            setOpen(value)
        }
    };
    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogTrigger
                render={
                    <Button variant="outline">
                        <Pencil className="mr-1" />
                        Edit Vehicle
                    </Button>
                }
            />

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        Edit Vehicle
                    </DialogTitle>

                    <DialogDescription>
                        Update the information for{" "}
                        {vehicle.nickname}.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        {/* Vehicle Information */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Vehicle Information
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Basic information about your vehicle.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Nickname"
                                    error={
                                        form.formState.errors.nickname
                                            ?.message
                                    }
                                >
                                    <Input
                                        {...form.register("nickname")}
                                    />
                                </FormField>

                                <FormField
                                    label="Manufacturer"
                                    error={
                                        form.formState.errors.manufacturer
                                            ?.message
                                    }
                                >
                                    <Input
                                        {...form.register("manufacturer")}
                                    />
                                </FormField>

                                <FormField
                                    label="Model"
                                    error={
                                        form.formState.errors.model?.message
                                    }
                                >
                                    <Input
                                        {...form.register("model")}
                                    />
                                </FormField>

                                <FormField
                                    label="Variant"
                                    error={
                                        form.formState.errors.variant
                                            ?.message
                                    }
                                >
                                    <Input
                                        {...form.register("variant")}
                                    />
                                </FormField>

                                <FormField
                                    label="Year"
                                    error={
                                        form.formState.errors.year?.message
                                    }
                                >
                                    <Input
                                        type="number"
                                        {...form.register("year")}
                                    />
                                </FormField>

                                <FormField
                                    label="Current Mileage (km)"
                                    error={
                                        form.formState.errors.current_mileage
                                            ?.message
                                    }
                                >
                                    <Input
                                        type="number"
                                        min={0}
                                        {...form.register(
                                            "current_mileage",
                                        )}
                                    />
                                </FormField>
                            </div>
                        </section>

                        {/* Specifications */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Specifications
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Engine and drivetrain information.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Fuel Type"
                                    error={
                                        form.formState.errors.fuel_type
                                            ?.message
                                    }
                                >
                                    <Select
                                        value={form.watch("fuel_type")}
                                        onValueChange={(value) =>
                                            form.setValue(
                                                "fuel_type",
                                                value as VehicleUpdateFormValues["fuel_type"],
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
                                            <SelectItem value="PETROL">
                                                Petrol
                                            </SelectItem>

                                            <SelectItem value="DIESEL">
                                                Diesel
                                            </SelectItem>

                                            <SelectItem value="HYBRID">
                                                Hybrid
                                            </SelectItem>

                                            <SelectItem value="PHEV">
                                                Plug-in Hybrid
                                            </SelectItem>

                                            <SelectItem value="EV">
                                                Electric
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormField>

                                <FormField
                                    label="Transmission"
                                    error={
                                        form.formState.errors.transmission
                                            ?.message
                                    }
                                >
                                    <Select
                                        value={form.watch("transmission")}
                                        onValueChange={(value) =>
                                            form.setValue(
                                                "transmission",
                                                value as VehicleUpdateFormValues["transmission"],
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
                                            <SelectItem value="MANUAL">
                                                Manual
                                            </SelectItem>

                                            <SelectItem value="AUTOMATIC">
                                                Automatic
                                            </SelectItem>

                                            <SelectItem value="CVT">
                                                CVT
                                            </SelectItem>

                                            <SelectItem value="DCT">
                                                DCT
                                            </SelectItem>

                                            <SelectItem value="AMT">
                                                AMT
                                            </SelectItem>

                                            <SelectItem value="EV_SINGLE_SPEED">
                                                EV Single Speed
                                            </SelectItem>

                                            <SelectItem value="OTHER">
                                                Other
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormField>

                                <FormField
                                    label="Engine"
                                    error={
                                        form.formState.errors.engine?.message
                                    }
                                >
                                    <Input
                                        {...form.register("engine")}
                                    />
                                </FormField>
                            </div>
                        </section>

                        {/* Vehicle Details */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Vehicle Details
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Ownership and identification details.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Plate Number"
                                    error={
                                        form.formState.errors.plate_number
                                            ?.message
                                    }
                                >
                                    <Input
                                        {...form.register("plate_number")}
                                    />
                                </FormField>

                                <FormField
                                    label="VIN"
                                    error={
                                        form.formState.errors.vin?.message
                                    }
                                >
                                    <Input
                                        {...form.register("vin")}
                                    />
                                </FormField>

                                <FormField
                                    label="Color"
                                    error={
                                        form.formState.errors.color?.message
                                    }
                                >
                                    <Input
                                        {...form.register("color")}
                                    />
                                </FormField>

                                <FormField
                                    label="Purchase Date"
                                    error={
                                        form.formState.errors.purchase_date
                                            ?.message
                                    }
                                >
                                    <Input
                                        type="date"
                                        {...form.register("purchase_date")}
                                    />
                                </FormField>
                            </div>
                        </section>

                        {/* Additional Information */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Additional Information
                                </h3>
                            </div>

                            <FormField
                                label="Photo URL"
                                error={
                                    form.formState.errors.photo_url?.message
                                }
                            >
                                <Input
                                    {...form.register("photo_url")}
                                />
                            </FormField>

                            <FormField
                                label="Notes"
                                error={
                                    form.formState.errors.notes?.message
                                }
                            >
                                <Textarea
                                    className="min-h-24"
                                    {...form.register("notes")}
                                />
                            </FormField>
                        </section>

                        <DialogFooter className="pr-1">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={updateVehicle.isPending}
                                onClick={() =>
                                    handleOpenChange(false)
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={updateVehicle.isPending}
                            >
                                {updateVehicle.isPending && (
                                    <Loader2 className="animate-spin" />
                                )}

                                {updateVehicle.isPending
                                    ? "Saving..."
                                    : "Save Changes"}
                            </Button>
                        </DialogFooter>

                        <ScrollBar orientation="vertical" />
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}