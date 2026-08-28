import { Card, CardContent } from "@/shared/components/ui/card";
import { useNavigate } from "react-router-dom";

import { useVehicles } from "@/features/garage/hooks/useVehicles";
import { useAllMaintenance } from "@/features/maintenance/hooks/useMaintenance";
import { VehicleOverviewCard } from "../components/VehicleOverviewCard";
import { CarFront } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { MaintenanceSummary } from "../components/MaintenanceSummary";

export default function DashboardPage() {
    const navigate = useNavigate();
    const {
        data: vehicles,
        isLoading: isVehiclesLoading,
        isError: isVehiclesError,
        error: vehiclesError,
    } = useVehicles();

    const {
        data: maintenance,
        isLoading: isMaintenanceLoading,
        isError: isMaintenanceError,
        error: maintenanceError,
    } = useAllMaintenance();

    const isLoading = isVehiclesLoading || isMaintenanceLoading;
    const isError = isVehiclesError || isMaintenanceError;

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <div className="space-y-2">
                    <div className="h-8 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-64 animate-pulse rounded bg-muted" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="font-heading text-2xl font-semibold tracking-tight">
                        Dashboard
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        An overview of your vehicles and maintenance.
                    </p>
                </div>

                <Card >
                    <CardContent className="flex min-h-40 items-center justify-center p-6">
                        <div>
                            <h2>
                                Unable to load dashboard
                            </h2>

                            <p>
                                {vehiclesError instanceof Error
                                    ? vehiclesError.message
                                    : maintenanceError instanceof Error
                                        ? maintenanceError.message
                                        : "Something went wrong while loading your dashboard."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight">
                    Dashboard
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    An overview of your vehicles and maintenance.
                </p>
            </div>

            {/* Garage w Cars */}
            {vehicles && vehicles.length > 0 && (
                <div>
                    <div className="mb-4">
                        <h2 className="font-heading text-lg font-semibold">
                            Your Vehicles
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Vehicles currently in your garage
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {vehicles.map((vehicle) => (
                            <VehicleOverviewCard
                                key={vehicle.id}
                                vehicle={vehicle}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Maintenance Card */}
            {vehicles && vehicles.length > 0 && maintenance && (
                <MaintenanceSummary 
                    maintenance={maintenance}
                    vehicles={vehicles}
                />
            )}

            {/* Empty Garage */}
            {vehicles && vehicles.length === 0 && (
                <Card>
                    <CardContent className="flex min-h-48 items-center justify-center p-6">
                        <div className="max-w-md text-center">
                            <CarFront className="mx-auto mb-3 size-10 text-muted-foreground" />

                            <h2 className="font-heading text-lg font-semibold">
                                Your garage is empty
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Add your first vehicle to start tracking its
                                information and maintenance.
                            </p>

                            <Button
                                className="mt-4"
                                onClick={() => navigate("/garage")}
                            >
                                Go to Garage
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}