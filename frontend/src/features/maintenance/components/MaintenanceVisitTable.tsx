import { ChevronDown, ChevronUp, Wrench } from "lucide-react";
import { Fragment, useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { DeleteMaintenanceDialog } from "./DeleteMaintenanceDialog";
import { EditMaintenanceDialog } from "./EditMaintenanceDialog";
import { useMaintenance } from "../hooks/useMaintenance";
import type { ServiceVisit } from "../types/maintenance";

interface MaintenanceVisitTableProps {
    vehicleId: string;
}

function formatEnum(value: string | null | undefined): string {
    if (!value) return "Unknown service";
    return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(date);
}

function formatCost(cost: number | null | undefined): string {
    if (cost === null || cost === undefined) return "—";
    return `RM ${cost.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getVisitStatus(visit: ServiceVisit): string {
    if (visit.items.some((item) => item.schedule_status === "OVERDUE")) return "OVERDUE";
    if (visit.items.some((item) => item.schedule_status === "UPCOMING")) return "UPCOMING";
    return "COMPLETED";
}

function getVisitTotal(visit: ServiceVisit): number | null {
    const costs = visit.items.flatMap((item) => item.cost === null ? [] : [item.cost]);
    return costs.length ? costs.reduce((total, cost) => total + cost, 0) : null;
}

function VisitDetails({ visit }: { visit: ServiceVisit }) {
    return (
        <div className="space-y-4 rounded-lg bg-muted/30 p-4">
            <div className="space-y-3">
                {visit.items.map((item) => (
                    <article key={item.id} className="rounded-md border bg-card p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-medium">{formatEnum(item.type)}</h4>
                                    {item.schedule_status && <Badge variant="outline">{formatEnum(item.schedule_status)}</Badge>}
                                </div>
                                {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                            </div>
                            <span className="text-sm font-medium">{formatCost(item.cost)}</span>
                        </div>

                        {(item.next_due_date !== null || item.next_due_mileage !== null) && (
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Next due:</span>
                                {item.next_due_date !== null && <span>{formatDate(item.next_due_date)}</span>}
                                {item.next_due_mileage !== null && <span>{item.next_due_mileage.toLocaleString("en-MY")} km</span>}
                            </div>
                        )}
                        {item.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{item.notes}</p>}
                    </article>
                ))}
            </div>

            {visit.notes && (
                <div className="rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Visit notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{visit.notes}</p>
                </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-3">
                <EditMaintenanceDialog serviceVisit={visit} />
                <DeleteMaintenanceDialog serviceVisit={visit} />
            </div>
        </div>
    );
}

function DetailsButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
    return (
        <Button type="button" variant="outline" size="sm" aria-expanded={expanded} onClick={onClick}>
            {expanded ? <ChevronUp /> : <ChevronDown />}
            {expanded ? "Hide details" : "View details"}
        </Button>
    );
}

export function MaintenanceVisitTable({ vehicleId }: MaintenanceVisitTableProps) {
    const { data: visits, isLoading, isError } = useMaintenance(vehicleId);
    const [expandedVisits, setExpandedVisits] = useState<Record<string, boolean>>({});
    const toggleVisit = (id: string) => setExpandedVisits((current) => ({ ...current, [id]: !current[id] }));

    if (isLoading) {
        return <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
    }

    if (isError) {
        return <div className="rounded-lg border border-destructive/30 p-6 text-center text-sm">Unable to load maintenance records. Please try again later.</div>;
    }

    if (!visits?.length) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <Wrench className="mx-auto mb-3 size-8 text-muted-foreground" />
                <h3 className="font-medium">No maintenance records</h3>
                <p className="mt-1 text-sm text-muted-foreground">Maintenance history and service records will appear here.</p>
            </div>
        );
    }

    return (
        <>
            <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                    <caption className="sr-only">Maintenance service visits</caption>
                    <thead className="border-b text-xs text-muted-foreground">
                        <tr>
                            <th scope="col" className="px-3 py-3 font-medium">Date</th>
                            <th scope="col" className="px-3 py-3 font-medium">Mileage</th>
                            <th scope="col" className="px-3 py-3 font-medium">Workshop</th>
                            <th scope="col" className="px-3 py-3 font-medium">Items</th>
                            <th scope="col" className="px-3 py-3 font-medium">Status</th>
                            <th scope="col" className="px-3 py-3 text-right font-medium">Total</th>
                            <th scope="col" className="px-3 py-3 text-right font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {visits.map((visit) => {
                            const expanded = Boolean(expandedVisits[visit.id]);
                            const total = getVisitTotal(visit);
                            return (
                                <Fragment key={visit.id}>
                                    <tr className="align-middle hover:bg-muted/30">
                                        <td className="whitespace-nowrap px-3 py-3 font-medium">{formatDate(visit.service_date)}</td>
                                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{visit.mileage_at_service.toLocaleString("en-MY")} km</td>
                                        <td className="max-w-48 truncate px-3 py-3 text-muted-foreground">{visit.workshop || "—"}</td>
                                        <td className="whitespace-nowrap px-3 py-3">{visit.items.length} {visit.items.length === 1 ? "item" : "items"}</td>
                                        <td className="px-3 py-3"><Badge variant="outline">{formatEnum(getVisitStatus(visit))}</Badge></td>
                                        <td className="whitespace-nowrap px-3 py-3 text-right font-medium">{formatCost(total)}</td>
                                        <td className="px-3 py-3 text-right">
                                            <DetailsButton expanded={expanded} onClick={() => toggleVisit(visit.id)} />
                                        </td>
                                    </tr>
                                    {expanded && (
                                        <tr key={`${visit.id}-details`}>
                                            <td colSpan={7} className="px-3 py-4">
                                                <VisitDetails visit={visit} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="space-y-3 lg:hidden">
                {visits.map((visit) => {
                    const expanded = Boolean(expandedVisits[visit.id]);
                    const total = getVisitTotal(visit);
                    return (
                        <Card key={visit.id}>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{formatDate(visit.service_date)}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{visit.mileage_at_service.toLocaleString("en-MY")} km · {visit.items.length} {visit.items.length === 1 ? "item" : "items"}</p>
                                    </div>
                                    <Badge variant="outline">{formatEnum(getVisitStatus(visit))}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between gap-2 border-t pt-3 text-sm">
                                    <span className="max-w-[65%] truncate text-muted-foreground">{visit.workshop || "No workshop recorded"}</span>
                                    <span className="font-medium">{formatCost(total)}</span>
                                </div>
                                <div className="flex justify-end">
                                    <DetailsButton expanded={expanded} onClick={() => toggleVisit(visit.id)} />
                                </div>
                                {expanded && <VisitDetails visit={visit} />}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </>
    );
}
