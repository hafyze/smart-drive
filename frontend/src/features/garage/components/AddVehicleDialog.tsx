import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import { useCreateVehicle } from "../hooks/useVehicles";
import {
    vehicleCreateSchema,
    type VehicleCreateFormInput,
    type VehicleCreateFormValues,
} from "../validation/vehicleSchema";

export function AddVehicleDialog() {
    const [open, setOpen] = useState(false);

    const createVehicle = useCreateVehicle();

    const form = useForm<
        VehicleCreateFormInput,
        undefined,
        VehicleCreateFormValues
    >({
        resolver: zodResolver(vehicleCreateSchema),
        defaultValues: {
            nickname: "",
            manufacturer: "",
            model: "",
            variant: "",
            year: new Date().getFullYear(),
            current_mileage: 0,
            fuel_type: "PETROL",
            transmission: "AUTOMATIC",
            engine: "",
            plate_number: "",
            purchase_date: "",
            vin: "",
            color: "",
            photo_url: "",
            notes: "",
        },
    });

    const onSubmit = async (values: VehicleCreateFormValues) => {
        await createVehicle.mutateAsync({
            ...values,
            engine: values.engine || null,
            plate_number: values.plate_number || null,
            purchase_date: values.purchase_date || null,
            vin: values.vin || null,
            color: values.color || null,
            photo_url: values.photo_url || null,
            notes: values.notes || null,
        });

        form.reset();
        setOpen(false);
    };

    const handleOpenChange = (value: boolean) => {
        if (!createVehicle.isPending) {
            setOpen(value);

            if (!value) {
                form.reset();
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button>
                        <Plus />
                        Add Vehicle
                    </Button>
                }
            />

            <DialogContent className="max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Add Vehicle</DialogTitle>

                    <DialogDescription>
                        Add a vehicle to your Smart Drive garage.
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
                                    error={form.formState.errors.nickname?.message}
                                >
                                    <Input
                                        placeholder="e.g. Daily Driver"
                                        {...form.register("nickname")}
                                    />
                                </FormField>

                                <FormField
                                    label="Manufacturer"
                                    error={form.formState.errors.manufacturer?.message}
                                >
                                    <Input
                                        placeholder="e.g. Perodua"
                                        {...form.register("manufacturer")}
                                    />
                                </FormField>

                                <FormField
                                    label="Model"
                                    error={form.formState.errors.model?.message}
                                >
                                    <Input
                                        placeholder="e.g. Myvi"
                                        {...form.register("model")}
                                    />
                                </FormField>

                                <FormField
                                    label="Variant"
                                    error={form.formState.errors.variant?.message}
                                >
                                    <Input
                                        placeholder="e.g. 1.5 AV"
                                        {...form.register("variant")}
                                    />
                                </FormField>

                                <FormField
                                    label="Year"
                                    error={form.formState.errors.year?.message}
                                >
                                    <Input
                                        type="number"
                                        {...form.register("year")}
                                    />
                                </FormField>

                                <FormField
                                    label="Current Mileage (km)"
                                    error={
                                        form.formState.errors.current_mileage?.message
                                    }
                                >
                                    <Input
                                        type="number"
                                        min={0}
                                        {...form.register("current_mileage")}
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
                                    error={form.formState.errors.fuel_type?.message}
                                >
                                    <Select
                                        value={form.watch("fuel_type")}
                                        onValueChange={(value) =>
                                            form.setValue(
                                                "fuel_type",
                                                value as VehicleCreateFormValues["fuel_type"],
                                                { shouldValidate: true },
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
                                    error={form.formState.errors.transmission?.message}
                                >
                                    <Select
                                        value={form.watch("transmission")}
                                        onValueChange={(value) =>
                                            form.setValue(
                                                "transmission",
                                                value as VehicleCreateFormValues["transmission"],
                                                { shouldValidate: true },
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
                                    error={form.formState.errors.engine?.message}
                                >
                                    <Input
                                        placeholder="e.g. 1.5L 4-Cylinder"
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
                                    Optional ownership and identification details.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Plate Number"
                                    error={form.formState.errors.plate_number?.message}
                                >
                                    <Input
                                        placeholder="e.g. VAB 1234"
                                        {...form.register("plate_number")}
                                    />
                                </FormField>

                                <FormField
                                    label="VIN"
                                    error={form.formState.errors.vin?.message}
                                >
                                    <Input
                                        placeholder="Vehicle Identification Number"
                                        {...form.register("vin")}
                                    />
                                </FormField>

                                <FormField
                                    label="Color"
                                    error={form.formState.errors.color?.message}
                                >
                                    <Input
                                        placeholder="e.g. Pearl White"
                                        {...form.register("color")}
                                    />
                                </FormField>

                                <FormField
                                    label="Purchase Date"
                                    error={form.formState.errors.purchase_date?.message}
                                >
                                    <Input
                                        type="date"
                                        {...form.register("purchase_date")}
                                    />
                                </FormField>
                            </div>
                        </section>

                        {/* Additional */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="font-heading font-semibold">
                                    Additional Information
                                </h3>
                            </div>

                            <FormField
                                label="Photo URL"
                                error={form.formState.errors.photo_url?.message}
                            >
                                <Input
                                    placeholder="https://..."
                                    {...form.register("photo_url")}
                                />
                            </FormField>

                            <FormField
                                label="Notes"
                                error={form.formState.errors.notes?.message}
                            >
                                <Textarea
                                    placeholder="Anything else you want to remember about this vehicle..."
                                    className="min-h-24"
                                    {...form.register("notes")}
                                />
                            </FormField>
                        </section>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={createVehicle.isPending}
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={createVehicle.isPending}
                            >
                                {createVehicle.isPending && (
                                    <Loader2 className="animate-spin" />
                                )}

                                {createVehicle.isPending
                                    ? "Adding..."
                                    : "Add Vehicle"}
                            </Button>
                        </DialogFooter>
                    </form>
                </ScrollArea>

            </DialogContent>
        </Dialog>
    );
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