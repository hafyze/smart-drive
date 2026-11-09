import { useMemo } from "react";
import { ArrowRight, CalendarDays, CarFront, CircleDot, Gauge, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { VehicleResponse } from "../../types/vehicle";
import type { ServiceHistoryVisit } from "@/features/maintenance/types/serviceHistory";
import type { ServiceVisit } from "@/features/maintenance/types/maintenance";
import { AddMaintenanceDialog } from "@/features/maintenance/components/AddMaintenanceDialog";
import { calculateAreas, calculateOverallScore, TYPE_LABELS } from "@/features/maintenance/utils/maintenanceScore";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

type Tab = "overview" | "history" | "maintenance" | "insights" | "documents";

function formatDate(value: string | null) {
    if (!value) return "Not provided";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not provided" : new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(date);
}

function Specification({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-white/55" aria-hidden="true" />
            <div className="min-w-0">
                <p className="text-xs text-white/50">{label}</p>
                <p className="truncate text-sm font-medium text-white/90">{value || "Not provided"}</p>
            </div>
        </div>
    );
}

function dueLabel(dueMileage: number | null, dueDate: string | null, mileage: number) {
    const parts: string[] = [];
    if (dueMileage !== null) {
        const delta = dueMileage - mileage;
        parts.push(delta < 0 ? `${Math.abs(delta).toLocaleString("en-MY")} km overdue` : `in ${delta.toLocaleString("en-MY")} km`);
    }
    if (dueDate) {
        const due = new Date(`${dueDate}T00:00:00`);
        const now = new Date();
        const days = Math.ceil((due.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
        parts.push(days < 0 ? `${Math.abs(days)} days overdue` : `in ${days} days`);
    }
    return parts.join(" · ");
}

function isScheduleWithinAttentionWindow(dueMileage: number | null, dueDate: string | null, mileage: number) {
    if (dueMileage !== null && dueMileage - mileage <= 1_000) return true;
    if (dueDate) {
        const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
        return Number.isFinite(days) && days <= 30;
    }
    return false;
}

function MaintenanceHealthCard({ vehicle, visits, onViewMaintenance }: { vehicle: VehicleResponse; visits: ServiceVisit[]; onViewMaintenance: () => void }) {
    const areas = useMemo(() => calculateAreas(vehicle, visits), [vehicle, visits]);
    const { score, eligibleCount } = calculateOverallScore(areas);
    const attentionItems = areas
        .flatMap((area) => area.schedules
            .filter((schedule) => isScheduleWithinAttentionWindow(schedule.dueMileage, schedule.dueDate, vehicle.current_mileage))
            .map((schedule) => ({ area: area.name, ...schedule })))
        .slice(0, 3);
    const circumference = 2 * Math.PI * 44;

    return (
        <Card className="border-white/10 bg-[#121518] text-white shadow-[0_16px_45px_rgba(0,0,0,.22)]">
            <CardHeader>
                <h2 className="font-heading text-lg font-semibold">Maintenance Health</h2>
                <p className="text-xs text-white/55">Schedule tracking based on saved records</p>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
                <div className="relative mx-auto size-36">
                    <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="8" />
                        {score !== null && <circle cx="50" cy="50" r="44" fill="none" stroke="#ef3340" strokeLinecap="round" strokeWidth="8" strokeDasharray={`${circumference * score / 100} ${circumference}`} />}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {score === null ? <span className="text-sm text-white/50">No score</span> : <><span className="font-heading text-4xl font-bold">{score}</span><span className="text-xs text-white/50">/ 100</span></>}
                    </div>
                </div>
                <div className="min-w-0 space-y-3">
                    <div>
                        <h3 className="font-semibold">{score === null ? "More history needed" : "Schedule overview"}</h3>
                        <p className="text-xs text-white/55">
                            {score === null ? `${eligibleCount} of 6 areas have usable schedules; at least two are needed.` : `${eligibleCount} of 6 maintenance areas contribute to this score.`}
                        </p>
                    </div>
                    {attentionItems.length > 0 ? (
                        <ul className="space-y-2">
                            {attentionItems.map((item) => (
                                <li key={`${item.area}-${item.type}`} className="flex min-w-0 items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
                                    <span className="min-w-0 truncate text-white/75">{TYPE_LABELS[item.type]}</span>
                                    <span className="shrink-0 text-red-300">{dueLabel(item.dueMileage, item.dueDate, vehicle.current_mileage)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-white/50">No saved schedules are currently due soon or overdue.</p>
                    )}
                    <Button variant="ghost" size="sm" className="px-0 text-red-300 hover:bg-transparent hover:text-red-200" onClick={onViewMaintenance}>
                        View full maintenance <ArrowRight className="size-4" />
                    </Button>
                </div>
                <p className="sm:col-span-2 text-[11px] text-white/40">Tracking estimate only; this is not a mechanical inspection or diagnosis.</p>
            </CardContent>
        </Card>
    );
}

function MileageTrend({ records, currentMileage }: { records: ServiceHistoryVisit[]; currentMileage: number }) {
    const chartData = useMemo(() => [...records]
        .filter((record) => Number.isFinite(record.mileage) && Number.isFinite(new Date(record.service_date).getTime()))
        .sort((a, b) => new Date(a.service_date).getTime() - new Date(b.service_date).getTime())
        .map((record) => ({ date: record.service_date, label: new Intl.DateTimeFormat("en-MY", { month: "short", year: "2-digit" }).format(new Date(record.service_date)), mileage: record.mileage })), [records]);
    const latest = chartData.at(-1);
    const first = chartData[0];
    const range = first && latest
        ? `${new Intl.DateTimeFormat("en-MY", { month: "short", year: "numeric" }).format(new Date(first.date))} – ${new Intl.DateTimeFormat("en-MY", { month: "short", year: "numeric" }).format(new Date(latest.date))}`
        : null;

    return (
        <Card className="border-white/10 bg-[#121518] text-white shadow-[0_16px_45px_rgba(0,0,0,.22)]">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                    <h2 className="font-heading text-lg font-semibold">Mileage Trend</h2>
                    <p className="text-xs text-white/55">{range ? `${range} · ` : ""}Recorded mileage at each completed service</p>
                </div>
                {latest && <div className="text-right"><p className="text-xs text-white/50">Latest service</p><p className="text-sm font-semibold">{latest.mileage.toLocaleString("en-MY")} km</p></div>}
            </CardHeader>
            <CardContent>
                {chartData.length < 2 ? (
                    <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-white/50">
                        <Gauge className="size-6" />
                        <p>{chartData.length === 1 ? "Add another dated service mileage to show a trend." : "No dated service mileage is available yet."}</p>
                        <p className="text-xs">Current odometer: {currentMileage.toLocaleString("en-MY")} km · This is separate from historical readings.</p>
                    </div>
                ) : (
                    <div className="h-56 w-full" aria-label="Mileage by service date">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 2, bottom: 0 }}>
                                <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,.12)" }} tickLine={false} />
                                <YAxis width={52} tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} domain={["dataMin - 1000", "dataMax + 1000"]} />
                                <Tooltip
                                    contentStyle={{ background: "#171a1d", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "white" }}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? formatDate(payload[0].payload.date) : "Service date"}
                                    formatter={(value) => [`${Number(value).toLocaleString("en-MY")} km`, "Recorded mileage"]}
                                />
                                <Line type="monotone" dataKey="mileage" stroke="#ef3340" strokeWidth={3} dot={{ r: 3, fill: "#ef3340", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#ef3340" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RecentServiceHistory({ records, onViewHistory }: { records: ServiceHistoryVisit[]; onViewHistory: () => void }) {
    const recent = [...records].sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()).slice(0, 3);
    return (
        <Card className="border-white/10 bg-[#121518] text-white shadow-[0_16px_45px_rgba(0,0,0,.22)]">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div><h2 className="font-heading text-lg font-semibold">Recent Service History</h2><p className="text-xs text-white/55">Latest completed service visits</p></div>
                <Button variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white" onClick={onViewHistory}>View all <ArrowRight className="size-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {recent.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">No completed service visits recorded.</p> : recent.map((record) => (
                    <article key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[.07]"><Wrench className="size-4 text-red-300" /></span>
                            <div className="min-w-0"><p className="font-medium">{formatDate(record.service_date)}</p><p className="truncate text-xs text-white/50">{record.mileage.toLocaleString("en-MY")} km{record.workshop ? ` · ${record.workshop}` : ""}</p></div>
                        </div>
                        <div className="text-right"><p className="text-sm font-semibold">{record.total_cost === null ? "Cost not provided" : `RM ${record.total_cost.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`}</p><p className="text-xs text-white/45">{record.items.length} {record.items.length === 1 ? "item" : "items"}</p></div>
                    </article>
                ))}
            </CardContent>
        </Card>
    );
}

export function VehicleOverviewTab({
    vehicle,
    visits,
    serviceHistory,
    onSelectTab,
}: {
    vehicle: VehicleResponse;
    visits: ServiceVisit[];
    serviceHistory: ServiceHistoryVisit[];
    onSelectTab: (tab: Tab) => void;
}) {
    return (
        <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.15fr_1.1fr_.75fr]">
                <Card className="border-white/10 bg-[#121518] text-white shadow-[0_16px_45px_rgba(0,0,0,.22)]">
                    <CardHeader><h2 className="font-heading text-lg font-semibold">Vehicle Overview</h2><p className="text-xs text-white/55">Specifications and ownership details</p></CardHeader>
                    <CardContent className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                        <Specification icon={CarFront} label="Engine" value={vehicle.engine ?? "Not provided"} />
                        <Specification icon={CircleDot} label="Plate number" value={vehicle.plate_number ?? "Not provided"} />
                        <Specification icon={CircleDot} label="Colour" value={vehicle.color ?? "Not provided"} />
                        <Specification icon={CircleDot} label="VIN" value={vehicle.vin ?? "Not provided"} />
                        <Specification icon={CalendarDays} label="Purchase date" value={formatDate(vehicle.purchase_date)} />
                    </CardContent>
                </Card>

                <MaintenanceHealthCard vehicle={vehicle} visits={visits} onViewMaintenance={() => onSelectTab("maintenance")} />

                <Card className="border-white/10 bg-[#121518] text-white shadow-[0_16px_45px_rgba(0,0,0,.22)]">
                    <CardHeader><h2 className="font-heading text-lg font-semibold">Quick Actions</h2><p className="text-xs text-white/55">Common vehicle tasks</p></CardHeader>
                    <CardContent className="space-y-2">
                        <AddMaintenanceDialog vehicleId={vehicle.id} triggerLabel="Add Service Record" triggerClassName="w-full bg-red-600 text-white hover:bg-red-500" />
                        <Button variant="outline" className="w-full justify-start border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white" onClick={() => onSelectTab("maintenance")}><Gauge className="size-4" /> View Maintenance Plan</Button>
                        <Button variant="outline" className="w-full justify-start border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white" onClick={() => onSelectTab("documents")}><CircleDot className="size-4" /> Manage Documents</Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 2xl:grid-cols-[.9fr_1.1fr]">
                <MileageTrend records={serviceHistory} currentMileage={vehicle.current_mileage} />
                <RecentServiceHistory records={serviceHistory} onViewHistory={() => onSelectTab("history")} />
            </div>
        </div>
    );
}
