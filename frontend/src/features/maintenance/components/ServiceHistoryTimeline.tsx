import {
    Battery,
    CalendarDays,
    CircleDot,
    CircleStop,
    Droplets,
    Gauge,
    Settings2,
    Thermometer,
    Wind,
    Wrench,
} from "lucide-react";

import type { ServiceHistoryVisit } from "../types/serviceHistory";

interface ServiceHistoryTimelineProps {
    records: ServiceHistoryVisit[];
}

function getMaintenanceIcon(type: string) {
    const normalized = type.toLowerCase();

    if (
        normalized.includes("engine oil") ||
        normalized.includes("oil")
    ) {
        return Droplets;
    }

    if (normalized.includes("brake")) {
        return CircleStop;
    }

    if (
        normalized.includes("transmission") ||
        normalized.includes("gearbox")
    ) {
        return Settings2;
    }

    if (normalized.includes("battery")) {
        return Battery;
    }

    if (
        normalized.includes("coolant") ||
        normalized.includes("cooling")
    ) {
        return Thermometer;
    }

    if (
        normalized.includes("tire") ||
        normalized.includes("tyre")
    ) {
        return CircleDot;
    }

    if (
        normalized.includes("air filter") ||
        normalized.includes("cabin filter")
    ) {
        return Wind;
    }

    if (normalized.includes("inspection")) {
        return Gauge;
    }

    return Wrench;
}

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

export function ServiceHistoryTimeline({
    records,
}: ServiceHistoryTimelineProps) {
    return (
        <div className="relative">
            {records.map((record, index) => {
                const isLast = index === records.length - 1;

                return (
                    <div
                        key={record.id}
                        className="relative flex gap-4 sm:gap-6"
                    >
                        <div className="relative flex w-20 shrink-0 justify-end sm:w-24">
                            <div className="pt-1 text-right">
                                <p className="text-sm font-medium">
                                    {new Intl.DateTimeFormat("en-MY", {
                                        day: "2-digit",
                                        month: "short",
                                    }).format(
                                        new Date(record.service_date),
                                    )}
                                </p>

                                <p className="text-sm text-muted-foreground">
                                    {new Intl.DateTimeFormat("en-MY", {
                                        year: "numeric",
                                    }).format(
                                        new Date(record.service_date),
                                    )}
                                </p>
                            </div>

                            <div className="relative ml-4 flex w-4 justify-center">
                                {!isLast && (
                                    <div className="absolute top-5 h-full w-px bg-border" />
                                )}

                                <div className="relative z-10 mt-1 flex size-3 items-center justify-center rounded-full border-2 border-primary bg-background">
                                    <div className="size-1.5 rounded-full bg-primary" />
                                </div>
                            </div>
                        </div>

                        <div
                            className={`min-w-0 flex-1 ${
                                isLast ? "pb-2" : "pb-8"
                            }`}
                        >
                            <div className="w-full rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30 sm:p-5 lg:max-w-3xl">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Wrench className="size-4 shrink-0 text-muted-foreground" />

                                            <h3 className="font-semibold">
                                                Service Visit
                                            </h3>
                                        </div>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {record.items.length}{" "}
                                            {record.items.length === 1
                                                ? "maintenance item"
                                                : "maintenance items"}
                                        </p>
                                    </div>

                                    <p className="shrink-0 font-medium">
                                        {formatCost(record.total_cost)}
                                    </p>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="size-4" />
                                        {formatDate(
                                            record.service_date,
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Gauge className="size-4" />
                                        {record.mileage.toLocaleString(
                                            "en-MY",
                                        )}{" "}
                                        km
                                    </div>

                                    {record.workshop && (
                                        <div className="flex items-center gap-2">
                                            <Wrench className="size-4" />
                                            {record.workshop}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 space-y-2">
                                    {record.items.map((item) => {
                                        const MaintenanceIcon =
                                            getMaintenanceIcon(
                                                item.type,
                                            );

                                        return (
                                            <div
                                                key={item.id}
                                                className="rounded-lg bg-muted/40 p-3"
                                            >
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <MaintenanceIcon className="size-4 shrink-0 text-muted-foreground" />

                                                            <p className="font-medium">
                                                                {formatMaintenanceType(
                                                                    item.type,
                                                                )}
                                                            </p>
                                                        </div>

                                                        {item.description && (
                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                {
                                                                    item.description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>

                                                    <p className="shrink-0 text-sm font-medium">
                                                        {formatCost(
                                                            item.cost,
                                                        )}
                                                    </p>
                                                </div>

                                                {item.notes && (
                                                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {record.notes && (
                                    <div className="mt-4 rounded-lg border p-3">
                                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                            {record.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
