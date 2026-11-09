import { Card, CardContent } from "@/shared/components/ui/card";
import { AddMaintenanceDialog } from "@/features/maintenance/components/AddMaintenanceDialog";
import { MaintenanceVisitTable } from "@/features/maintenance/components/MaintenanceVisitTable";

export function VehicleServiceHistoryTab({ vehicleId }: { vehicleId: string }) {
    return (
        <div className="space-y-5">
            <Card className="border-white/10 bg-[#121518] text-white">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div><h2 className="font-heading text-xl font-semibold">Service History</h2><p className="text-sm text-white/55">Completed work, recorded mileage, schedules, costs, and attached receipts.</p></div>
                    <AddMaintenanceDialog vehicleId={vehicleId} triggerLabel="Add Service Record" triggerClassName="bg-red-600 text-white hover:bg-red-500" />
                </CardContent>
            </Card>
            <Card className="border-white/10 bg-[#121518] text-white">
                <CardContent className="p-3 sm:p-5"><MaintenanceVisitTable vehicleId={vehicleId} /></CardContent>
            </Card>
        </div>
    );
}
