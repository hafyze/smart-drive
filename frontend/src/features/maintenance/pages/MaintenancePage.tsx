import { useSearchParams } from "react-router-dom";

import { useVehicles } from "@/features/garage/hooks/useVehicles";
import type { VehicleListItem } from "@/features/garage/types/vehicle";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useMaintenance } from "../hooks/useMaintenance";
import { MaintenanceScoreContent } from "../components/MaintenanceScoreContent";
import { MaintenanceResearchPanel } from "../components/MaintenanceResearchPanel";

function VehicleSelector({ vehicles, value, onChange }: { vehicles: VehicleListItem[]; value: string; onChange: (value: string) => void }) {
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === value);
    return (
        <Select value={value} onValueChange={(nextValue) => { if (typeof nextValue === "string") onChange(nextValue); }}>
            <SelectTrigger className="w-full sm:w-80" aria-label="Choose vehicle">
                <SelectValue placeholder="Select a vehicle">
                    {selectedVehicle ? `${selectedVehicle.manufacturer} ${selectedVehicle.model}` : undefined}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.manufacturer} {vehicle.model} · {vehicle.nickname}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default function MaintenancePage() {
    const { data: vehicles, isLoading: vehiclesLoading, isError: vehiclesError } = useVehicles();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedVehicleId = searchParams.get("vehicleId") ?? "";
    const activeVehicle = vehicles?.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles?.[0];
    const { data: visits, isLoading: maintenanceLoading, isError: maintenanceError } = useMaintenance(activeVehicle?.id);

    const selectVehicle = (vehicleId: string) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (vehicleId) next.set("vehicleId", vehicleId);
            else next.delete("vehicleId");
            return next;
        });
    };

    return (
        <div className="space-y-6 p-6">
            <header className="space-y-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Maintenance</h1>
                <p className="text-sm text-muted-foreground">A local schedule-tracking score and separate, source-checked maintenance research.</p>
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
                        <VehicleSelector vehicles={vehicles ?? []} value={activeVehicle.id} onChange={selectVehicle} />
                        <p className="text-xs text-muted-foreground">{activeVehicle.manufacturer} {activeVehicle.model} · {activeVehicle.current_mileage.toLocaleString()} km recorded</p>
                    </div>

                    <MaintenanceResearchPanel key={activeVehicle.id} vehicleId={activeVehicle.id} />

                    {maintenanceLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading saved maintenance schedules…</CardContent></Card>}
                    {maintenanceError && <Card><CardContent className="p-6 text-sm text-destructive">Unable to load maintenance records for this vehicle.</CardContent></Card>}
                    {!maintenanceLoading && !maintenanceError && <MaintenanceScoreContent vehicle={activeVehicle} visits={visits ?? []} />}
                </div>
            )}
        </div>
    );
}
