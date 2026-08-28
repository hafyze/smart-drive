import {
    Calendar,
    ChevronDown,
    ChevronUp,
    Gauge,
    Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

import { useMaintenance } from "../hooks/useMaintenance";
import { EditMaintenanceDialog } from "./EditMaintenanceDialog";
import type { MaintenanceListItem } from "../types/maintenance";
import { DeleteMaintenanceDialog } from "./DeleteMaintenanceDialog";

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

interface MaintenanceGroup {
    key: string;
    serviceDate: string;
    mileage: number;
    workshop: string | null;
    records: MaintenanceListItem[];
}

export function MaintenanceList({
    vehicleId,
}: MaintenanceListProps) {
    const {
        data: maintenanceRecords,
        isLoading,
        isError,
    } = useMaintenance(vehicleId);

    const [expandedGroups, setExpandedGroups] = useState<
        Record<string, boolean>
    >({});

    const groups = useMemo<MaintenanceGroup[]>(() => {
        if (!maintenanceRecords) {
            return [];
        }

        const grouped = new Map<string, MaintenanceGroup>();

        for (const record of maintenanceRecords) {
            const workshop = record.workshop?.trim() || null;

            const key = [
                record.service_date,
                record.mileage_at_service,
                workshop?.toLowerCase() ?? "no-workshop",
            ].join("|");

            const existing = grouped.get(key);

            if (existing) {
                existing.records.push(record);
            } else {
                grouped.set(key, {
                    key,
                    serviceDate: record.service_date,
                    mileage: record.mileage_at_service,
                    workshop,
                    records: [record],
                });
            }
        }

        return Array.from(grouped.values()).sort(
            (a, b) =>
                new Date(b.serviceDate).getTime() -
                new Date(a.serviceDate).getTime(),
        );
    }, [maintenanceRecords]);

    const toggleGroup = (key: string) => {
        setExpandedGroups((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-40 animate-pulse rounded-lg bg-muted" />
                <div className="h-40 animate-pulse rounded-lg bg-muted" />
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
        <div className="space-y-6">
            {groups.map((group) => {
                const isExpanded = expandedGroups[group.key] ?? false;

                const totalCost = group.records.reduce(
                    (total, record) =>
                        total + (record.cost ?? 0),
                    0,
                );

                const hasCost = group.records.some(
                    (record) => record.cost !== null,
                );

                const status = group.records.every(
                    (record) => record.status === "COMPLETED",
                )
                    ? "COMPLETED"
                    : group.records.some(
                        (record) => record.status === "OVERDUE",
                    )
                        ? "OVERDUE"
                        : "UPCOMING";

                return (
                    <Card key={group.key}>
                        <CardContent className="p-0">
                            {/* Service Visit Header */}
                            <div className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <h3 className="font-semibold">
                                                {group.records.length > 1
                                                    ? "Service Visit"
                                                    : formatEnum(
                                                        group.records[0].type,
                                                    )}
                                            </h3>

                                            <Badge>
                                                {formatStatus(status)}
                                            </Badge>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="size-4" />
                                                {formatDate(group.serviceDate)}
                                            </span>

                                            <span className="flex items-center gap-1.5">
                                                <Gauge className="size-4" />
                                                {group.mileage.toLocaleString()} km
                                            </span>

                                            {group.workshop && (
                                                <span className="flex items-center gap-1.5">
                                                    <Wrench className="size-4" />
                                                    {group.workshop}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {hasCost && (
                                        <div className="shrink-0 text-right">
                                            <p className="text-xs text-muted-foreground">
                                                Total
                                            </p>

                                            <p className="font-semibold">
                                                RM {totalCost.toFixed(2)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Services */}
                                <div className="space-y-2">
                                    {group.records.map((record) => (
                                        <div
                                            key={record.id}
                                            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">
                                                    {formatEnum(record.type)}
                                                </p>

                                                <p className="truncate text-xs text-muted-foreground">
                                                    {record.description}
                                                </p>
                                            </div>

                                            <div className="ml-4 shrink-0 text-right">
                                                {record.cost !== null && (
                                                    <p className="text-sm font-medium">
                                                        RM{" "}
                                                        {record.cost.toFixed(2)}
                                                    </p>
                                                )}

                                                <p className="text-xs text-muted-foreground">
                                                    {formatStatus(record.status)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between border-t pt-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            toggleGroup(group.key)
                                        }
                                    >
                                        {isExpanded ? (
                                            <>
                                                <ChevronUp />
                                                Hide details
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown />
                                                View details
                                            </>
                                        )}
                                    </Button>

                                    {group.records.length === 1 && (
                                        <EditMaintenanceDialog
                                            maintenance={group.records[0]}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t bg-muted/20 px-5 py-5">
                                    <div className="space-y-5">
                                        {group.records.map((record) => (
                                            <div
                                                key={record.id}
                                                className="space-y-4 border-b pb-5 last:border-b-0 last:pb-0"
                                            >
                                                {/* Service Header */}
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h4 className="font-medium">
                                                            {formatEnum(record.type)}
                                                        </h4>

                                                        <p className="text-sm text-muted-foreground">
                                                            {record.description}
                                                        </p>
                                                    </div>

                                                    {record.cost !== null && (
                                                        <p className="shrink-0 text-sm font-medium">
                                                            RM {record.cost.toFixed(2)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Next Service */}
                                                {(record.next_due_date !== null ||
                                                    record.next_due_mileage !== null) && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">
                                                                Next Service
                                                            </p>

                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                                {record.next_due_date !== null && (
                                                                    <span>
                                                                        {formatDate(record.next_due_date)}
                                                                    </span>
                                                                )}

                                                                {record.next_due_mileage !== null && (
                                                                    <span>
                                                                        {record.next_due_mileage.toLocaleString()}{" "}
                                                                        km
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                {/* Notes */}
                                                {record.notes && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            Notes
                                                        </p>

                                                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                                            {record.notes}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex justify-end gap-1">
                                                    <EditMaintenanceDialog
                                                        maintenance={record}
                                                    />

                                                    <DeleteMaintenanceDialog
                                                        maintenance={record}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}