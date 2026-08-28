import {
    Calendar,
    Gauge,
    Wrench,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";

import { useMaintenance } from "../hooks/useMaintenance";
import { EditMaintenanceDialog } from "./EditMaintenanceDialog";

interface MaintenanceListProps {
    vehicleId: string;
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
    }).format(new Date(value));
}

function formatStatus(status: string) {
    return formatEnum(status);
}

export function MaintenanceList({
    vehicleId,
}: MaintenanceListProps) {
    const {
        data: maintenanceRecords,
        isLoading,
        isError,
    } = useMaintenance(vehicleId);

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="h-32 animate-pulse rounded-lg bg-muted" />
                <div className="h-32 animate-pulse rounded-lg bg-muted" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-lg border border-destructive/30 p-6 text-center">
                <p className="font-medium">
                    Unable to load maintenance records
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                    Please try again later.
                </p>
            </div>
        );
    }

    if (!maintenanceRecords || maintenanceRecords.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <Wrench className="mx-auto mb-3 size-8 text-muted-foreground" />

                <h3 className="font-medium">
                    No maintenance records
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                    Maintenance records for this vehicle will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {maintenanceRecords.map((record) => (
                <Card key={record.id}>
                    <CardContent className="space-y-5 p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="font-semibold">
                                    {formatEnum(record.type)}
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    {record.description}
                                </p>
                            </div>

                            <Badge>
                                {formatStatus(record.status)}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-1">
                            <Badge>
                                {formatStatus(record.status)}
                            </Badge>

                            <EditMaintenanceDialog maintenance={record}/>
                        </div>

                        {/* Service Information */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Service Date
                                </p>

                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Calendar className="size-4 text-muted-foreground" />

                                    <span>
                                        {formatDate(record.service_date)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Mileage
                                </p>

                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Gauge className="size-4 text-muted-foreground" />

                                    <span>
                                        {record.mileage_at_service.toLocaleString()} km
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Cost
                                </p>

                                <p className="text-sm font-medium">
                                    {record.cost !== null
                                        ? `RM ${record.cost.toFixed(2)}`
                                        : "Not provided"}
                                </p>
                            </div>
                        </div>

                        {/* Workshop */}
                        {record.workshop && (
                            <div className="border-t pt-4">
                                <p className="text-xs text-muted-foreground">
                                    Workshop
                                </p>

                                <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                                    <Wrench className="size-4 text-muted-foreground" />

                                    <span>
                                        {record.workshop}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Next Service */}
                        {(record.next_due_date !== null ||
                            record.next_due_mileage !== null) && (
                            <div className="border-t pt-4">
                                <p className="text-xs text-muted-foreground">
                                    Next Service
                                </p>

                                <div className="mt-1 flex flex-wrap gap-4 text-sm font-medium">
                                    {record.next_due_date !== null && (
                                        <span>
                                            {formatDate(record.next_due_date)}
                                        </span>
                                    )}

                                    {record.next_due_mileage !== null && (
                                        <span>
                                            {record.next_due_mileage.toLocaleString()} km
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}