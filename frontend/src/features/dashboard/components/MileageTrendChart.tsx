import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import type { ServiceVisit } from "@/features/maintenance/types/maintenance";
import type { VehicleListItem } from "@/features/garage/types/vehicle";
import { VehicleSelect } from "./MaintenanceHealthCard";

type Range = "6" | "12" | "all";
const DASHBOARD_NOW = Date.now();
export function MileageTrendChart({ vehicles, visits, selectedVehicleId, onVehicleChange, isLoading, isError }: { vehicles: VehicleListItem[]; visits: ServiceVisit[] | undefined; selectedVehicleId: string; onVehicleChange: (id: string) => void; isLoading: boolean; isError: boolean }) {
    const [range, setRange] = useState<Range>("6");
    const vehicle = vehicles.find((entry) => entry.id === selectedVehicleId) ?? vehicles[0];
    const vehicleId = vehicle?.id;
    const data = useMemo(() => {
        if (!vehicleId || !visits) return [];
        const unique = new Map(visits.filter((visit) => visit.vehicle_id === vehicleId).map((visit) => [visit.id, visit]));
        const sorted = [...unique.values()].sort((a, b) => a.service_date.localeCompare(b.service_date) || a.updated_at.localeCompare(b.updated_at));
        const cutoff = range === "all" ? 0 : DASHBOARD_NOW - Number(range) * 30 * 86_400_000;
        return sorted.filter((visit) => new Date(`${visit.service_date.slice(0, 10)}T00:00:00`).getTime() >= cutoff).map((visit) => ({ date: visit.service_date, label: new Intl.DateTimeFormat("en-MY", { month: "short", year: "2-digit" }).format(new Date(`${visit.service_date.slice(0, 10)}T00:00:00`)), mileage: visit.mileage_at_service }));
    }, [visits, vehicleId, range]);
    return <Card className="border-white/10 bg-[#101214] text-white"><CardHeader className="flex flex-wrap flex-row items-start justify-between gap-2 px-4 pb-2 pt-4 sm:px-5"><div><h2 className="font-heading text-base font-semibold">Mileage Trend</h2><p className="text-[11px] text-white/45">Service mileage for one vehicle</p></div><div className="flex max-w-full flex-wrap gap-2">{vehicles.length > 0 && <VehicleSelect vehicles={vehicles} value={vehicle?.id ?? ""} onChange={onVehicleChange} label="Mileage chart vehicle"/>}<Select value={range} onValueChange={(value) => { if (value === "6" || value === "12" || value === "all") setRange(value); }}><SelectTrigger className="h-8 w-24 border-white/10 bg-white/[0.04] text-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="6">6 months</SelectItem><SelectItem value="12">12 months</SelectItem><SelectItem value="all">All history</SelectItem></SelectContent></Select></div></CardHeader><CardContent className="p-3 pt-1 sm:p-4 sm:pt-2">{isLoading ? <div className="h-52 animate-pulse rounded-xl bg-white/[0.05]"/> : isError ? <div className="flex h-52 items-center justify-center text-center text-sm text-white/55">Mileage history is unavailable.</div> : data.length < 2 ? <div className="flex h-52 flex-col items-center justify-center text-center"><p className="text-sm font-medium">Not enough mileage history yet</p><p className="mt-1 max-w-xs text-xs text-white/45">Add service visits with mileage to see a trend. At least two records are needed.</p></div> : <div className="h-52 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 8, left: 2, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false}/><XAxis dataKey="label" tick={{ fill: "#89919b", fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis width={58} tickFormatter={(value: number) => value.toLocaleString("en-MY")} tick={{ fill: "#89919b", fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(new Date(`${payload[0].payload.date.slice(0,10)}T00:00:00`)) : ""} formatter={(value) => [`${Number(value).toLocaleString("en-MY")} km`, "Mileage"]} contentStyle={{ background: "#171a1e", border: "1px solid #34383e", borderRadius: 10, color: "#fff" }}/><Line type="monotone" dataKey="mileage" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: "#f43f5e", stroke: "#111315", strokeWidth: 2 }} activeDot={{ r: 5 }}/></LineChart></ResponsiveContainer></div>}</CardContent></Card>;
}

