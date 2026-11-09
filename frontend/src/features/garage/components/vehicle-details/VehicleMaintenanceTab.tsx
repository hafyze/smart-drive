import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { AddMaintenanceDialog } from "@/features/maintenance/components/AddMaintenanceDialog";
import { Link } from "react-router-dom";
import { MaintenanceScoreContent } from "@/features/maintenance/components/MaintenanceScoreContent";
import type { ServiceVisit } from "@/features/maintenance/types/maintenance";
import type { VehicleResponse } from "../../types/vehicle";

export function VehicleMaintenanceTab({ vehicle, visits, isLoading, isError }: {
    vehicle: VehicleResponse;
    visits: ServiceVisit[];
    isLoading: boolean;
    isError: boolean;
}) {
    return (
        <div className="space-y-5">
            <Card className="border-white/10 bg-[#121518] text-white">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div><h2 className="font-heading text-xl font-semibold">Maintenance Plan</h2><p className="text-sm text-white/55">Saved due dates and mileage schedules grouped by system.</p></div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" render={<Link to={`/maintenance/planner?vehicleId=${encodeURIComponent(vehicle.id)}`} />}>Open Planner</Button>
                        <AddMaintenanceDialog vehicleId={vehicle.id} triggerLabel="Add Maintenance" triggerClassName="bg-red-600 text-white hover:bg-red-500" />
                    </div>
                </CardContent>
            </Card>
            {isLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading saved maintenance schedules…</CardContent></Card>}
            {isError && <Card><CardContent className="p-6 text-sm text-destructive">Unable to load maintenance records. Please try again later.</CardContent></Card>}
            {!isLoading && !isError && <MaintenanceScoreContent vehicle={vehicle} visits={visits} />}
        </div>
    );
}
