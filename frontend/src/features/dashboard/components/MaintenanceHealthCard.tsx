import { useMemo } from "react";
import { ArrowRight, CircleHelp, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

import type { ServiceVisit } from "@/features/maintenance/types/maintenance";
import type { VehicleListItem } from "@/features/garage/types/vehicle";
import { calculateAreas, calculateOverallScore, STATUS_CONTENT } from "@/features/maintenance/utils/maintenanceScore";
import { AddMaintenanceDialog } from "@/features/maintenance/components/AddMaintenanceDialog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export function VehicleSelect({ vehicles, value, onChange, label = "Vehicle" }: { vehicles: VehicleListItem[]; value: string; onChange: (id: string) => void; label?: string }) {
    return <div className="flex min-w-0 items-center gap-2"><label className="sr-only" htmlFor="dashboard-vehicle-select">{label}</label><Select value={value} onValueChange={(next) => { if (next) onChange(next); }}><SelectTrigger id="dashboard-vehicle-select" className="h-8 min-w-0 max-w-full border-white/10 bg-white/[0.04] text-white sm:w-56"><SelectValue /></SelectTrigger><SelectContent>{vehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.manufacturer} {vehicle.model} · {vehicle.nickname}</SelectItem>)}</SelectContent></Select></div>;
}

export function MaintenanceHealthCard({ vehicles, visits, selectedVehicleId, onVehicleChange, isLoading, isError, onRetry }: { vehicles: VehicleListItem[]; visits: ServiceVisit[] | undefined; selectedVehicleId: string; onVehicleChange: (id: string) => void; isLoading: boolean; isError: boolean; onRetry: () => void }) {
    const vehicle = vehicles.find((entry) => entry.id === selectedVehicleId) ?? vehicles[0];
    const vehicleVisits = useMemo(() => visits?.filter((visit) => visit.vehicle_id === vehicle?.id) ?? [], [visits, vehicle?.id]);
    const areas = useMemo(() => vehicle ? calculateAreas(vehicle, vehicleVisits) : [], [vehicle, vehicleVisits]);
    const result = calculateOverallScore(areas);
    const status = areas.filter((area) => area.status !== "NO_DATA").reduce((worst, area) => area.status === "OVERDUE" ? "OVERDUE" : area.status === "DUE_SOON" && worst !== "OVERDUE" ? "DUE_SOON" : worst, "UP_TO_DATE" as "UP_TO_DATE" | "DUE_SOON" | "OVERDUE");
    const scoreColor = result.score === null ? "#6b7280" : result.score >= 85 ? "#22c55e" : result.score >= 60 ? "#f59e0b" : "#ef4444";
    const circumference = 2 * Math.PI * 48;

    return <Card className="border-white/10 bg-[#101214] text-white"><CardHeader className="flex flex-row items-start justify-between gap-2 px-4 pb-2 pt-4 sm:px-5"><div><h2 className="font-heading text-lg font-semibold">Maintenance Health</h2><p className="text-xs text-white/50">Schedule estimate for one vehicle</p></div>{vehicles.length > 0 && <VehicleSelect vehicles={vehicles} value={vehicle?.id ?? ""} onChange={onVehicleChange} />}</CardHeader><CardContent className="p-4 pt-1 sm:p-5 sm:pt-2">
        {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-white/[0.05]" /> : isError ? <div className="flex min-h-40 flex-col items-center justify-center text-center"><p className="text-sm text-white/60">Unable to load maintenance health.</p><Button variant="ghost" size="sm" onClick={onRetry} className="mt-2 text-red-300">Try again</Button></div> : !vehicle ? <p className="py-12 text-center text-sm text-white/55">Add a vehicle to track maintenance schedules.</p> : <>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                <div className="relative grid size-32 shrink-0 place-items-center"><svg viewBox="0 0 112 112" className="size-full -rotate-90" aria-hidden="true"><circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="9"/><circle cx="56" cy="56" r="48" fill="none" stroke={scoreColor} strokeWidth="9" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={result.score === null ? circumference : circumference * (1 - result.score / 100)} className="transition-all duration-500"/></svg><div className="absolute text-center"><p className="font-heading text-3xl font-bold">{result.score ?? "—"}</p><p className="text-[10px] text-white/50">{result.score === null ? "No score" : "/ 100"}</p></div></div>
                <div className="min-w-0 text-center sm:text-left"><p className="font-medium">{result.score === null ? "More service history needed" : STATUS_CONTENT[status].label}</p><p className="mt-1 text-xs leading-5 text-white/55">{result.score === null ? `At least two maintenance areas need saved due dates or mileage. ${result.eligibleCount} currently have usable schedule data.` : `${vehicle.manufacturer} ${vehicle.model}: ${result.eligibleCount} areas with saved schedules contribute to this estimate.`}</p><p className="mt-2 inline-flex items-center gap-1 text-[10px] text-white/40"><CircleHelp className="size-3"/> Tracking estimate, not a mechanical diagnosis</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3"><AddMaintenanceDialog vehicleId={vehicle.id} triggerLabel="Add Service Record" triggerClassName="h-8 bg-red-500/15 text-red-100 hover:bg-red-500/25"/><Button variant="ghost" size="sm" render={<Link to={`/maintenance?vehicleId=${encodeURIComponent(vehicle.id)}`} />} className="h-8 text-white/70 hover:bg-white/10 hover:text-white"><Wrench className="size-3.5"/> View maintenance <ArrowRight className="size-3.5"/></Button></div>
        </>}
    </CardContent></Card>;
}
