import { CalendarDays, Gauge, Wrench } from "lucide-react";
import { useParams } from "react-router-dom";

import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

import { useServiceHistory } from "../hooks/useServiceHistory";

function formatMaintenanceType(type: string) {
    return type
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
    }).format(new Date(value));
}

function formatCost(cost: number | null) {
    if (cost === null) {
        return "Cost not provided";
    }

    return `RM ${cost.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export default function ServiceHistoryPage() {
    const { vehicleId } = useParams();

    const {
        data: serviceHistory,
        isLoading,
        isError,
        error,
    } = useServiceHistory(vehicleId ?? "");

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <div className="space-y-2">
                    <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-72 animate-pulse rounded bg-muted" />
                </div>

                <Card>
                    <CardContent className="space-y-6 p-6">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="space-y-3"
                            >
                                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                                <div className="h-4 w-64 animate-pulse rounded bg-muted" />
                                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="font-heading text-2xl font-semibold tracking-tight">
                        Service History
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        View completed maintenance and service records.
                    </p>
                </div>

                <Card>
                    <CardContent className="flex min-h-40 items-center justify-center p-6">
                        <div className="text-center">
                            <h2 className="font-medium">
                                Unable to load service history
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {error instanceof Error
                                    ? error.message
                                    : "Something went wrong while loading service history."
                                }
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
                    Service History
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Completed maintenance and service records for this vehicle.
                </p>
            </div>

            {/* Empty */}
            {serviceHistory?.length === 0 && (
                <Card>
                    <CardContent className="flex min-h-48 items-center justify-center p-6">
                        <div className="max-w-md text-center">
                            <Wrench className="mx-auto mb-3 size-10 text-muted-foreground" />

                            <h2 className="font-heading text-lg font-semibold">
                                No service history yet
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Completed maintenance records will appear here.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* History */}
            {serviceHistory && serviceHistory.length > 0 && (
                <Card>
                    <CardHeader>
                        <h2 className="font-heading text-lg font-semibold">
                            Completed Services
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            {serviceHistory.length}{" "}
                            {serviceHistory.length === 1
                                ? "service record"
                                : "service records"}
                        </p>
                    </CardHeader>

                    <CardContent>
                        <div className="space-y-6">
                            {serviceHistory.map((record) => (
                                <div
                                    key={record.id}
                                    className="border-b pb-6 last:border-b-0 last:pb-0"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-2">
                                            <h3 className="font-medium">
                                                {formatMaintenanceType(record.type)}
                                            </h3>

                                            {record.description && (
                                                <p className="text-sm text-muted-foreground">
                                                    {record.description}
                                                </p>
                                            )}

                                            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-5">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="size-4" />
                                                    {formatDate(record.service_date)}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Gauge className="size-4" />
                                                    {record.mileage_at_service.toLocaleString()} km
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-left sm:text-right">
                                            <p className="font-medium">
                                                {formatCost(record.cost)}
                                            </p>

                                            {record.workshop && (
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {record.workshop}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {record.notes && (
                                        <div className="mt-4 rounded-lg bg-muted/50 p-3">
                                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                                {record.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}