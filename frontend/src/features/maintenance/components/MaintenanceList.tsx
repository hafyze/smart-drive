import { Calendar, Gauge, Wrench } from "lucide-react";
import { useMaintenance } from "../hooks/useMaintenance";

interface MaintenanceListProps {
    vehicleId: string;
}

export function MaintenanceList({
    vehicleId,
}: MaintenanceListProps) {
    const {
        data: maintenanceRecords,
        isLoading,
        isError,
    } = useMaintenance(vehicleId);

    if (isLoading) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                Loading maintenance records...
            </div>
        );
    }

    if (isError) {
        return(
            <div className="py-8 text-center text-destructive">
                Failed to load maintenancce records.
            </div>
        );
    }

    if (!maintenanceRecords || maintenanceRecords.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

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
        <div className="space-y-3">
            {maintenanceRecords.map((record) => (
                <div key={record.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="font-medium">
                                {record.description}
                            </h3>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {record.type.replaceAll("_", " ")}
                            </p>
                        </div>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                            {record.status}
                        </span>
                    </div>
                    {/* Service Date */}
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-muted-foreground">
                                    Service date
                                </p>
                                <p>{record.service_date}</p>
                            </div>
                        </div>
                        {/* Mileage */}
                        <div className="flex items-center gap-2 text-sm">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                        
                            <div>
                                <p className="text-muted-foreground"> Mileage</p>
                                <p>{record.mileage_at_service.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Cost */}
                        <div>
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-muted-foreground">Cost</p>
                                <p>{record.cost !== null
                                        ? `RM ${record.cost.toFixed(2)}`
                                        : "Not specified"
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {(record.next_due_date !== null || record.next_due_mileage != null) && (
                        <div className="mt-4 border-t pt-3 text-sm">
                            <p className="text-muted-foreground">
                                Next service
                            </p>

                            <div className="mt-1 flex flex-wrap gap-4">
                                {record.next_due_date !== null && (
                                    <span>
                                        {record.next_due_date}
                                    </span>
                                )}

                                {record.next_due_mileage !== null && (
                                    <span>
                                        {record.next_due_mileage.toLocaleString()} km
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
} 
