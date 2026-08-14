import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

import { useVehicles } from "../hooks/useVehicles";

export default function GaragePage() {
    const {
        data: vehicles,
        isLoading,
        isError,
        error,
    } = useVehicles();

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div >
                    <h1 className="font-heading text-2xl font-semibold tracking-tight">
                        Garage
                    </h1>

                    <p className="text-muted-foreground">
                        Manage your vehicles and keep track of their information
                    </p>
                </div>

                <Button>
                    <Plus />
                    Add Vehicle
                </Button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <Card key={item}>
                            <CardContent className="p-6">
                                <div className="space-y-3">
                                    <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                                    <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                                    <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Error */}
            {isError && (
                <Card>
                    <CardContent className="flex min-h-40 items-center justify-center p-6">
                        <div className="text-center">
                            <h2 className="font-medium">
                                Unable to load your vehicles
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {error instanceof Error
                                    ? error.message
                                    : "Something went wrong while loading your garage."
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty */}
            {!isLoading && !isError && vehicles?.length === 0 && (
                <Card>
                    <CardContent className="flex min-h-64 items-center justify-center p-6">
                        <div className="max-w-md text-center">
                            <h2 className="font-heading text-xl font-semibold">
                                Your garage is empty
                            </h2>

                            <p className="mt-2 text-sm text-muted-foreground">
                                Add your first vehicle to start tracking its information and maintenance
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Vehicle list */}
            {!isLoading && !isError && vehicles && vehicles.length > 0 && (
                <div>
                    {vehicles.map((vehicle) => (
                        <Card key={vehicle.id}>
                            <CardContent className="p-6">
                                <div className="space-y-2">
                                    <h2 className="font-heading text-lg font-semibold">
                                        {vehicle.nickname}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {vehicle.manufacturer} {vehicle.model}
                                    </p>
                                    <p className="text-sm">
                                        {vehicle.variant}
                                    </p>

                                    <div className="flex gap-2 text-sm text-muted-foreground">
                                        <span>{vehicle.year}</span>
                                        <span>•</span>
                                        <span>
                                            {vehicle.current_mileage.toLocaleString()} km
                                        </span>
                                    </div>

                                    <div className="pt-2">
                                        <span className="text-xs font-medium">
                                            {vehicle.status}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}