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

import { useDeleteVehiclePhoto, useUpdateVehicle, useUploadVehiclePhoto } from "../hooks/useVehicles";
import { VehiclePhotoField } from "./VehiclePhotoField";
import { MakeModelFields } from "./MakeModelFields";
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
    const uploadPhoto = useUploadVehiclePhoto();
    const deletePhoto = useDeleteVehiclePhoto();
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [removeCurrentPhoto, setRemoveCurrentPhoto] = useState(false);
    const photoMutationPending = uploadPhoto.isPending || deletePhoto.isPending;

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
            setPhotoFile(null);
            setRemoveCurrentPhoto(false);
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

            if (photoFile) {
                await uploadPhoto.mutateAsync({ vehicleId: vehicle.id, file: photoFile });
            } else if (removeCurrentPhoto && vehicle.photo_url) {
                await deletePhoto.mutateAsync(vehicle.id);
            }

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
        if (!updateVehicle.isPending && !uploadPhoto.isPending && !deletePhoto.isPending) {
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

            <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-hidden sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>
                        Edit Vehicle
                    </DialogTitle>

                    <DialogDescription>
                        Update the information for{" "}
                        {vehicle.nickname}.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(100dvh-10rem)] min-h-0 pr-4">
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

                                <MakeModelFields
                                    manufacturer={form.watch("manufacturer") ?? ""}
                                    model={form.watch("model") ?? ""}
                                    manufacturerError={form.formState.errors.manufacturer?.message}
                                    modelError={form.formState.errors.model?.message}
                                    onManufacturerChange={(value) => form.setValue("manufacturer", value, { shouldDirty: true, shouldValidate: true })}
                                    onModelChange={(value) => form.setValue("model", value, { shouldDirty: true, shouldValidate: true })}
                                />

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

                            <VehiclePhotoField
                                currentPhotoUrl={vehicle.photo_url}
                                file={photoFile}
                                onFileChange={setPhotoFile}
                                removed={removeCurrentPhoto}
                                onRemoveCurrent={() => setRemoveCurrentPhoto(true)}
                                onRestoreCurrent={() => setRemoveCurrentPhoto(false)}
                            />

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
                                disabled={updateVehicle.isPending || photoMutationPending}
                                onClick={() =>
                                    handleOpenChange(false)
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={updateVehicle.isPending || photoMutationPending}
                            >
                                {(updateVehicle.isPending || photoMutationPending) && (
                                    <Loader2 className="animate-spin" />
                                )}

                                {updateVehicle.isPending || photoMutationPending
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
