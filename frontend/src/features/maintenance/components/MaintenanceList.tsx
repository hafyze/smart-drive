import {
    Calendar,
    ChevronDown,
    ChevronUp,
    Gauge,
    Wrench,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

import { useMaintenance } from "../hooks/useMaintenance";
import { EditMaintenanceDialog } from "./EditMaintenanceDialog";
import { DeleteMaintenanceDialog } from "./DeleteMaintenanceDialog";

import type { ServiceVisit } from "../types/maintenance";

interface MaintenanceListProps {
    vehicleId: string;
}

function formatEnum(value: string | null | undefined): string {
    if (!value) {
        return "Unknown Service";
    }

    return value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
    if (!value) {
        return "Date unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
    }).format(date);
}

function formatStatus(
    status: string | null | undefined,
): string {
    if (!status) {
        return "Unknown";
    }

    return formatEnum(status);
}

function formatCost(cost: number | null | undefined): string {
    if (cost === null || cost === undefined) {
        return "";
    }

    return `RM ${cost.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function getVisitStatus(serviceVisit: ServiceVisit): string {
    if (
        serviceVisit.items.some(
            (item) => item.schedule_status === "OVERDUE",
        )
    ) {
        return "OVERDUE";
    }

    if (
        serviceVisit.items.some(
            (item) => item.schedule_status === "UPCOMING",
        )
    ) {
        return "UPCOMING";
    }

    return "COMPLETED";
}

export function MaintenanceList({
    vehicleId,
}: MaintenanceListProps) {
    const {
        data: serviceVisits,
        isLoading,
        isError,
    } = useMaintenance(vehicleId);

    const [expandedVisits, setExpandedVisits] = useState<
        Record<string, boolean>
    >({});

    const toggleVisit = (serviceVisitId: string) => {
        setExpandedVisits((current) => ({
            ...current,
            [serviceVisitId]: !current[serviceVisitId],
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

    if (!serviceVisits || serviceVisits.length === 0) {
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
            {serviceVisits.map((serviceVisit) => {
                const isExpanded =
                    expandedVisits[serviceVisit.id] ?? false;

                const totalCost = serviceVisit.items.reduce(
                    (total, item) => total + (item.cost ?? 0),
                    0,
                );

                const hasCost = serviceVisit.items.some(
                    (item) => item.cost !== null,
                );

                const isMultiItem =
                    serviceVisit.items.length > 1;

                const status = getVisitStatus(serviceVisit);

                return (
                    <Card key={serviceVisit.id}>
                        <CardContent className="p-0">
                            <div className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <h3 className="font-semibold">
                                                {isMultiItem
                                                    ? "Service Visit"
                                                    : formatEnum(
                                                          serviceVisit
                                                              .items[0]
                                                              ?.type,
                                                      )}
                                            </h3>

                                            <Badge>
                                                {formatStatus(status)}
                                            </Badge>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="size-4" />

                                                {formatDate(
                                                    serviceVisit.service_date,
                                                )}
                                            </span>

                                            <span className="flex items-center gap-1.5">
                                                <Gauge className="size-4" />

                                                {serviceVisit.mileage_at_service.toLocaleString(
                                                    "en-MY",
                                                )}{" "}
                                                km
                                            </span>

                                            {serviceVisit.workshop && (
                                                <span className="flex items-center gap-1.5">
                                                    <Wrench className="size-4" />

                                                    {
                                                        serviceVisit.workshop
                                                    }
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
                                                {formatCost(totalCost)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {serviceVisit.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">
                                                    {formatEnum(
                                                        item.type,
                                                    )}
                                                </p>

                                                {item.description && (
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {
                                                            item.description
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <div className="ml-4 shrink-0 text-right">
                                                {item.cost !== null && (
                                                    <p className="text-sm font-medium">
                                                        {formatCost(
                                                            item.cost,
                                                        )}
                                                    </p>
                                                )}

                                                <p className="text-xs text-muted-foreground">
                                                    {formatStatus(
                                                        item.status,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {serviceVisit.notes && (
                                    <p className="whitespace-pre-wrap rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                                        {serviceVisit.notes}
                                    </p>
                                )}

                                <div className="flex items-center justify-between border-t pt-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            toggleVisit(
                                                serviceVisit.id,
                                            )
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

                                    <div className="flex justify-end gap-1">
                                        <EditMaintenanceDialog
                                            serviceVisit={serviceVisit}
                                        />

                                        <DeleteMaintenanceDialog
                                            serviceVisit={serviceVisit}
                                        />
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t bg-muted/20 px-5 py-5">
                                    <div className="space-y-5">
                                        {serviceVisit.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="space-y-4 border-b pb-5 last:border-b-0 last:pb-0"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="font-medium">
                                                                {formatEnum(
                                                                    item.type,
                                                                )}
                                                            </h4>

                                                            {item.schedule_status && (
                                                                <Badge>
                                                                    {formatStatus(
                                                                        item.schedule_status,
                                                                    )}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {item.description && (
                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                {
                                                                    item.description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>

                                                    {item.cost !== null && (
                                                        <p className="shrink-0 text-sm font-medium">
                                                            {formatCost(
                                                                item.cost,
                                                            )}
                                                        </p>
                                                    )}
                                                </div>

                                                {(item.next_due_date !==
                                                    null ||
                                                    item.next_due_mileage !==
                                                        null) && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            Next Service
                                                        </p>

                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                            {item.next_due_date !==
                                                                null && (
                                                                <span>
                                                                    {formatDate(
                                                                        item.next_due_date,
                                                                    )}
                                                                </span>
                                                            )}

                                                            {item.next_due_mileage !==
                                                                null && (
                                                                <span>
                                                                    {item.next_due_mileage.toLocaleString(
                                                                        "en-MY",
                                                                    )}{" "}
                                                                    km
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {item.notes && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            Notes
                                                        </p>

                                                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                                            {item.notes}
                                                        </p>
                                                    </div>
                                                )}
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
