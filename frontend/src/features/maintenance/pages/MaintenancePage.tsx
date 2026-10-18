import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CalendarClock, Gauge, ShieldCheck, Wrench } from "lucide-react";

import { useVehicles } from "@/features/garage/hooks/useVehicles";
import type { VehicleListItem } from "@/features/garage/types/vehicle";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useMaintenance } from "../hooks/useMaintenance";
import type { MaintenanceItem, MaintenanceType, ServiceVisit } from "../types/maintenance";

type AreaName = "Engine" | "Transmission" | "Cooling" | "Brakes" | "Battery" | "Tyres";
type AreaStatus = "UP_TO_DATE" | "DUE_SOON" | "OVERDUE" | "NO_DATA";

interface ScoredArea {
    name: AreaName;
    status: AreaStatus;
    score: number | null;
    schedules: Array<{ type: MaintenanceType; dueDate: string | null; dueMileage: number | null }>;
}

const AREA_TYPES: Record<AreaName, MaintenanceType[]> = {
    Engine: ["ENGINE_OIL", "OIL_FILTER", "AIR_FILTER", "CABIN_FILTER", "SPARK_PLUG", "TIMING_BELT"],
    Transmission: ["TRANSMISSION"],
    Cooling: ["COOLANT"],
    Brakes: ["BRAKE_SERVICE", "BRAKE_FLUID"],
    Battery: ["BATTERY"],
    Tyres: ["TYRE", "ALIGNMENT"],
};

const TYPE_LABELS: Record<MaintenanceType, string> = {
    ENGINE_OIL: "Engine oil",
    OIL_FILTER: "Oil filter",
    AIR_FILTER: "Air filter",
    CABIN_FILTER: "Cabin filter",
    BRAKE_SERVICE: "Brake service",
    BRAKE_FLUID: "Brake fluid",
    COOLANT: "Coolant",
    TRANSMISSION: "Transmission",
    BATTERY: "Battery",
    TYRE: "Tyres",
    ALIGNMENT: "Wheel alignment",
    SPARK_PLUG: "Spark plugs",
    TIMING_BELT: "Timing belt",
    INSPECTION: "Inspection",
    OTHER: "Other",
};

function currentLocalDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function mostRecentSchedule(maintenance: MaintenanceItem[], visits: ServiceVisit[]) {
    const serviceDateByItem = new Map<string, { date: string; mileage: number }>();
    for (const visit of visits) {
        for (const item of visit.items) {
            serviceDateByItem.set(item.id, { date: visit.service_date, mileage: visit.mileage_at_service });
        }
    }

    const latestByType = new Map<MaintenanceType, MaintenanceItem>();
    const sorted = [...maintenance].sort((a, b) => {
        const aVisit = serviceDateByItem.get(a.id);
        const bVisit = serviceDateByItem.get(b.id);
        return (bVisit?.date ?? "").localeCompare(aVisit?.date ?? "") ||
            (bVisit?.mileage ?? 0) - (aVisit?.mileage ?? 0);
    });

    for (const item of sorted) {
        if (!latestByType.has(item.type)) latestByType.set(item.type, item);
    }
    return latestByType;
}

function getAreaStatus(
    schedules: ScoredArea["schedules"],
    currentMileage: number,
    today: string,
): AreaStatus {
    if (schedules.length === 0) return "NO_DATA";

    let dueSoon = false;
    for (const schedule of schedules) {
        if (schedule.dueMileage !== null) {
            const distance = schedule.dueMileage - currentMileage;
            if (distance < 0) return "OVERDUE";
            if (distance <= 1000) dueSoon = true;
        }
        if (schedule.dueDate) {
            if (schedule.dueDate < today) return "OVERDUE";
            const due = new Date(`${schedule.dueDate}T00:00:00`);
            const now = new Date(`${today}T00:00:00`);
            const daysRemaining = Math.round((due.getTime() - now.getTime()) / 86_400_000);
            if (daysRemaining <= 30) dueSoon = true;
        }
    }
    return dueSoon ? "DUE_SOON" : "UP_TO_DATE";
}

function calculateAreas(vehicle: VehicleListItem, visits: ServiceVisit[]): ScoredArea[] {
    const flatItems = visits.flatMap((visit) => visit.items);
    const latestByType = mostRecentSchedule(flatItems, visits);
    const today = currentLocalDate();

    return (Object.keys(AREA_TYPES) as AreaName[]).map((name) => {
        const schedules = AREA_TYPES[name]
            .map((type) => latestByType.get(type))
            .filter((item): item is MaintenanceItem => Boolean(item))
            .filter((item) => item.next_due_date !== null || item.next_due_mileage !== null)
            .map((item) => ({ type: item.type, dueDate: item.next_due_date, dueMileage: item.next_due_mileage }));
        const status = getAreaStatus(schedules, vehicle.current_mileage, today);
        const score = status === "UP_TO_DATE" ? 100 : status === "DUE_SOON" ? 70 : status === "OVERDUE" ? 30 : null;
        return { name, status, score, schedules };
    });
}

const STATUS_CONTENT: Record<AreaStatus, { label: string; description: string; className: string }> = {
    UP_TO_DATE: { label: "Up to date", description: "Recorded schedules are outside the due-soon window.", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    DUE_SOON: { label: "Due soon", description: "A recorded schedule is due within 1,000 km or 30 days.", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    OVERDUE: { label: "Overdue", description: "At least one latest recorded schedule has passed its due point.", className: "bg-destructive/10 text-destructive" },
    NO_DATA: { label: "No data", description: "No saved next-due schedule is available for this area.", className: "bg-muted text-muted-foreground" },
};

function VehicleSelector({ vehicles, value, onChange }: { vehicles: VehicleListItem[]; value: string; onChange: (value: string) => void }) {
    return (
        <Select value={value} onValueChange={(nextValue) => { if (typeof nextValue === "string") onChange(nextValue); }}>
            <SelectTrigger className="w-full sm:w-80" aria-label="Choose vehicle">
                <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
                {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.nickname} · {vehicle.manufacturer} {vehicle.model}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function ScoreContent({ vehicle, visits }: { vehicle: VehicleListItem; visits: ServiceVisit[] }) {
    const areas = useMemo(() => calculateAreas(vehicle, visits), [vehicle, visits]);
    const scored = areas.filter((area) => area.score !== null);
    const score = scored.length >= 2
        ? Math.round(scored.reduce((total, area) => total + (area.score ?? 0), 0) / scored.length)
        : null;

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div className="flex size-28 flex-col items-center justify-center rounded-full border-8 border-primary/20 text-center">
                        {score === null ? (
                            <Activity className="size-8 text-muted-foreground" />
                        ) : (
                            <>
                                <span className="font-heading text-3xl font-bold">{score}</span>
                                <span className="text-xs text-muted-foreground">out of 100</span>
                            </>
                        )}
                    </div>
                    <div className="space-y-2">
                        <h2 className="font-heading text-xl font-semibold">
                            {score === null ? "More maintenance history needed" : "Maintenance tracking score"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {score === null
                                ? `Only ${scored.length} of 6 areas have a saved next-due schedule. Add schedules for at least two areas to calculate a score.`
                                : `Based on ${scored.length} of 6 areas with saved next-due schedules. Areas without schedule data are excluded.`}
                        </p>
                        <p className="flex items-start gap-2 text-xs text-muted-foreground">
                            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                            This is a maintenance-tracking estimate from your records, not an inspection or diagnosis of physical vehicle condition.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <section className="space-y-3" aria-labelledby="maintenance-areas-heading">
                <div>
                    <h2 id="maintenance-areas-heading" className="font-heading text-lg font-semibold">Maintenance areas</h2>
                    <p className="text-sm text-muted-foreground">Each area uses the latest recorded schedule for each maintenance type.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {areas.map((area) => {
                        const status = STATUS_CONTENT[area.status];
                        const Icon = area.status === "OVERDUE" ? AlertTriangle : area.status === "DUE_SOON" ? CalendarClock : area.status === "NO_DATA" ? Wrench : ShieldCheck;
                        return (
                            <Card key={area.name}>
                                <CardHeader className="flex grid-cols-[1fr_auto] items-center">
                                    <div className="flex items-center gap-2">
                                        <Icon className="size-4 text-muted-foreground" />
                                        <h3 className="font-heading text-base font-semibold">{area.name}</h3>
                                    </div>
                                    <Badge className={status.className}>{status.label}</Badge>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-muted-foreground">{status.description}</p>
                                    {area.schedules.length > 0 && (
                                        <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                                            {area.schedules.map((schedule) => (
                                                <li key={schedule.type} className="flex justify-between gap-2">
                                                    <span>{TYPE_LABELS[schedule.type]}</span>
                                                    <span className="text-right">
                                                        {schedule.dueMileage !== null ? `${schedule.dueMileage.toLocaleString()} km` : ""}
                                                        {schedule.dueMileage !== null && schedule.dueDate ? " · " : ""}
                                                        {schedule.dueDate ?? ""}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            <Card>
                <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
                    <Gauge className="mt-0.5 size-4 shrink-0" />
                    <p>Scoring rules: up to date = 100, due within 1,000 km or 30 days = 70, overdue = 30. The displayed score is the rounded average across areas with usable schedule data. No outside vehicle data or third-party AI is used.</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function MaintenancePage() {
    const { data: vehicles, isLoading: vehiclesLoading, isError: vehiclesError } = useVehicles();
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const activeVehicle = vehicles?.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles?.[0];
    const { data: visits, isLoading: maintenanceLoading, isError: maintenanceError } = useMaintenance(activeVehicle?.id);

    return (
        <div className="space-y-6 p-6">
            <header className="space-y-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">AI Maintenance Score</h1>
                <p className="text-sm text-muted-foreground">An explainable estimate of how well maintenance schedules are being tracked.</p>
            </header>

            {vehiclesLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading your vehicles…</CardContent></Card>}
            {vehiclesError && <Card><CardContent className="p-6 text-sm text-destructive">Unable to load your vehicles. Please try again later.</CardContent></Card>}
            {!vehiclesLoading && !vehiclesError && vehicles?.length === 0 && (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">Add a vehicle to see its maintenance score.</CardContent></Card>
            )}
            {!vehiclesLoading && !vehiclesError && activeVehicle && (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Vehicle</p>
                        <VehicleSelector vehicles={vehicles ?? []} value={activeVehicle.id} onChange={setSelectedVehicleId} />
                        <p className="text-xs text-muted-foreground">{activeVehicle.manufacturer} {activeVehicle.model} · {activeVehicle.current_mileage.toLocaleString()} km recorded</p>
                    </div>
                    {maintenanceLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading saved maintenance schedules…</CardContent></Card>}
                    {maintenanceError && <Card><CardContent className="p-6 text-sm text-destructive">Unable to load maintenance records for this vehicle.</CardContent></Card>}
                    {!maintenanceLoading && !maintenanceError && <ScoreContent vehicle={activeVehicle} visits={visits ?? []} />}
                </div>
            )}
        </div>
    );
}
