import { ArrowLeft, CarFront, Gauge } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { History } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

import { EditVehicleDialog } from "../components/EditVehicleDialog";

import { useVehicle } from "../hooks/useVehicles";

import { MaintenanceList } from "@/features/maintenance/components/MaintenanceList";
import { AddMaintenanceDialog } from "@/features/maintenance/components/AddMaintenanceDialog";

interface VehicleDetailProps {
    label: string;
    value: string;
    icon?: React.ReactNode
}

function VehicleDetail({
    label, value, icon
}: VehicleDetailProps) {
    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
                {label}
            </p>

            <div className="flex items-center gap-2 font-medium">
                {icon && (
                    <span className="text-muted-foreground">
                        {icon}
                    </span>
                )}

                <span>{value}</span>
            </div>
        </div>
    )
}

function formatEnum(value: string) {
    return value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}
function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
    }).format(new Date(value))
}

export default function VehicleDetailsPage() {
    const navigate = useNavigate();
    const { vehicleId } = useParams();

    const {
        data: vehicle,
        isLoading,
        isError,
        error,
    } = useVehicle(vehicleId ?? "");

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-32 animate-pulse rounded-bg-mute">

                    <Card>
                        <CardContent className="space-y-4">
                            <div className="h-6 w-48 animate-pulse rounded bg-muted" ></div>
                            <div className="h-6 w-64 animate-pulse rounded bg-muted"></div>
                            <div className="h-6 w-40 animate-pulse rounded bg-muted"></div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (isError || !vehicle) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate("/garage")}>
                    <ArrowLeft />
                    Back to Garage
                </Button>

                <Card>
                    <CardContent className="flex min-h-48 items-center justify-center p-6">
                        <div className="text-center">
                            <h2 className="font-heading text-lg font-semibold">
                                Unable to load vehicle
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {error instanceof Error
                                    ? error.message
                                    : "The vehicle could not be found"
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/garage")}
                    aria-label="Back to garage"
                >
                    <ArrowLeft />
                </Button>

                <div>
                    <h1 className="text-sm text-muted-foreground">
                        {vehicle.nickname}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {vehicle.manufacturer} {vehicle.model} {" "}
                        {vehicle.variant}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <EditVehicleDialog vehicle={vehicle} />

                <Button
                    variant="outline"
                    onClick={() => navigate(`/garage/${vehicleId}/service-history`)}
                >
                    <History className="size-4" />
                    Service History
                </Button>
            </div>
            {/* Vehicle Information */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <h2 className="font-heading text-lg font-semibold">
                            Vehicle Information
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Basic information about your vehicle
                        </p>
                    </div>

                    <Badge>
                        {vehicle.status}
                    </Badge>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* Main Vehicle Summary */}
                    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
                        {/* Vehicle Image */}
                        <div className="aspect-4/3 overflow-hidden rounded-xl bg-muted">
                            {vehicle.photo_url ? (
                                <img
                                    src={vehicle.photo_url}
                                    alt={`${vehicle.manufacturer} ${vehicle.model}`}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <CarFront className="size-14 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        {/* Vehicle Summary */}
                        <div className="flex flex-col justify-center space-y-4">
                            <div>
                                <p className="text-lg font-semibold">
                                    {vehicle.nickname}
                                </p>

                                <p className="text-muted-foreground">
                                    {vehicle.manufacturer} {vehicle.model}{" "}
                                    {vehicle.variant}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Year
                                </p>

                                <p className="font-medium">
                                    {vehicle.year}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Gauge className="size-4 text-muted-foreground" />

                                <span className="font-medium">
                                    {vehicle.current_mileage.toLocaleString()} km
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatEnum(vehicle.fuel_type)}</span>
                                <span>•</span>
                                <span>{formatEnum(vehicle.transmission)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t" />

                    {/* Additional Vehicle Information */}
                    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                        <VehicleDetail
                            label="Engine"
                            value={vehicle.engine ?? "Not provided"}
                        />

                        <VehicleDetail
                            label="Plate Number"
                            value={vehicle.plate_number ?? "Not provided"}
                        />

                        <VehicleDetail
                            label="Color"
                            value={vehicle.color ?? "Not provided"}
                        />

                        <VehicleDetail
                            label="VIN"
                            value={vehicle.vin ?? "Not provided"}
                        />

                        <VehicleDetail
                            label="Purchase Date"
                            value={
                                vehicle.purchase_date
                                    ? formatDate(vehicle.purchase_date)
                                    : "Not provided"
                            }
                        />
                    </div>

                    {/* Notes */}
                    {vehicle.notes && (
                        <>
                            <div className="border-t" />

                            <div className="space-y-2">
                                <p className="text-sm font-medium">
                                    Notes
                                </p>

                                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                    {vehicle.notes}
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Maintenance */}
            <Card>
                <div>
                    <CardHeader>
                        <h2 className="font-heading text-lg font-semibold">
                            Maintenance
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Maintenance history and service records
                        </p>
                    </CardHeader>

                    <CardContent>
                        <MaintenanceList vehicleId={vehicle.id} />
                    </CardContent>
                </div>
                <AddMaintenanceDialog vehicleId={vehicle.id} />
            </Card>
        </div>
    )

}

