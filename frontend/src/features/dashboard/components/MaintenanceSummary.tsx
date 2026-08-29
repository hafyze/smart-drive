import { AlertTriangle, Calendar, CheckCircle2, Gauge } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

import type { VehicleListItem } from "@/features/garage/types/vehicle";
import type { MaintenanceListItem } from "@/features/maintenance/types/maintenance";

interface MaintenanceSummaryProps {
    maintenance: MaintenanceListItem[];
    vehicles: VehicleListItem[];
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

function getVehicleName(
    vehicleId: string,
    vehicles: VehicleListItem[],
) {
    const vehicle = vehicles.find(
        (item) => item.id === vehicleId,
    );

    if (!vehicle) {
        return "Unknown vehicle";
    }

    return vehicle.nickname;
}

interface MaintenanceItemProps {
    record: MaintenanceListItem;
    vehicles: VehicleListItem[];
}

function MaintenanceItem({
    record,
    vehicles,
}: MaintenanceItemProps) {
    const vehicleName = getVehicleName(
        record.vehicle_id,
        vehicles,
    );

    return (
        <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="font-medium">
                        {formatEnum(record.type)}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {vehicleName}
                    </p>
                </div>

                <Badge>
                    {formatEnum(record.status)}
                </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {record.next_due_date && (
                    <span className="flex items-center gap-1.5">
                        <Calendar className="size-4" />
                        {formatDate(record.next_due_date)}
                    </span>
                )}

                {record.next_due_mileage !== null && (
                    <span className="flex items-center gap-1.5">
                        <Gauge className="size-4" />
                        {record.next_due_mileage.toLocaleString()} km
                    </span>
                )}
            </div>
        </div>
    );
}

export function MaintenanceSummary({
    maintenance,
    vehicles,
}: MaintenanceSummaryProps) {
    const upcomingMaintenance = maintenance
        .filter((record) => record.schedule_status === "UPCOMING")
        .sort((a, b) => {
            const aDate = a.next_due_date
                ? new Date(a.next_due_date).getTime()
                : Number.MAX_SAFE_INTEGER;

            const bDate = b.next_due_date
                ? new Date(b.next_due_date).getTime()
                : Number.MAX_SAFE_INTEGER;

            return aDate - bDate;
        });

    const overdueMaintenance = maintenance.filter(
        (record) => record.schedule_status === "OVERDUE",
    );

    return (
        <div className="space-y-6">
            {/* Upcoming */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Calendar className="size-5 text-muted-foreground" />

                        <div>
                            <h2 className="font-heading text-lg font-semibold">
                                Upcoming Maintenance
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Maintenance that is due soon
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {upcomingMaintenance.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                            <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground" />

                            <h3 className="font-medium">
                                No upcoming maintenance
                            </h3>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Your vehicles are currently up to date.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingMaintenance
                                .slice(0, 5)
                                .map((record) => (
                                    <MaintenanceItem
                                        key={record.id}
                                        record={record}
                                        vehicles={vehicles}
                                    />
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Overdue */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-muted-foreground" />

                        <div>
                            <h2 className="font-heading text-lg font-semibold">
                                Overdue Maintenance
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Maintenance that needs your attention
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {overdueMaintenance.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                            <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground" />

                            <h3 className="font-medium">
                                No overdue maintenance
                            </h3>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Great! Nothing needs your attention right now.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {overdueMaintenance
                                .slice(0, 5)
                                .map((record) => (
                                    <MaintenanceItem
                                        key={record.id}
                                        record={record}
                                        vehicles={vehicles}
                                    />
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}