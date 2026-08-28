import { Card, CardContent } from "@/shared/components/ui/card";

import { useVehicles } from "@/features/garage/hooks/useVehicles";
import { useAllMaintenance } from "@/features/maintenance/hooks/useMaintenance";

export default function DashboardPage() {
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
    const isError = isVehiclesLoading || isMaintenanceError;

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
                                        ?   maintenanceError.message
                                        :   "Something went wrong while loading your dashboard."}
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

            {/* Temp Data Verification */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground">
                            Vehicles
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                            {vehicles?.length}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground">
                            Maintenance Records
                        </p>

                        <p className="mt-1 text-2xl font-semibold">
                            {maintenance?.length ?? 0}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}