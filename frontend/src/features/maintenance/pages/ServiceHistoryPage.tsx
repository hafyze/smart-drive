import { ArrowLeft, Wrench } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ServiceHistoryTimeline } from "@/features/maintenance/components/ServiceHistoryTimeline";

import { useServiceHistory } from "../hooks/useServiceHistory";
import { Button } from "@/shared/components/ui/button";

export default function ServiceHistoryPage() {
    const { vehicleId } = useParams();
    const navigate = useNavigate();

    const {
        data: serviceHistory,
        isLoading,
        isError,
        error,
    } = useServiceHistory(vehicleId ?? "");

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <div className="space-y-2">
                    <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-72 animate-pulse rounded bg-muted" />
                </div>

                <Card>
                    <CardContent className="space-y-6 p-6">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="space-y-3"
                            >
                                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                                <div className="h-4 w-64 animate-pulse rounded bg-muted" />
                                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="font-heading text-2xl font-semibold tracking-tight">
                        Service History
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        View completed maintenance and service records.
                    </p>
                </div>

                <Card>
                    <CardContent className="flex min-h-40 items-center justify-center p-6">
                        <div className="text-center">
                            <h2 className="font-medium">
                                Unable to load service history
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {error instanceof Error
                                    ? error.message
                                    : "Something went wrong while loading service history."
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/garage/${vehicleId}`)}
                    aria-label="Back to garage"
                >
                    <ArrowLeft />
                </Button>

                <div>
                    <h1 className="font-heading text-2xl font-semibold tracking-tight">
                        Service History
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Completed maintenance and service records for this vehicle.
                    </p>
                </div>
            </div>

            {/* Empty */}
            {serviceHistory?.length === 0 && (
                <Card>
                    <CardContent className="flex min-h-48 items-center justify-center p-6">
                        <div className="max-w-md text-center">
                            <Wrench className="mx-auto mb-3 size-10 text-muted-foreground" />

                            <h2 className="font-heading text-lg font-semibold">
                                No service history yet
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Completed maintenance records will appear here.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* History */}
            {serviceHistory && serviceHistory.length > 0 && (
                <Card>
                    <CardHeader>
                        <h2 className="font-heading text-lg font-semibold">
                            Service Timeline
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            {serviceHistory.length}{" "}
                            {serviceHistory.length === 1
                                ? "service record"
                                : "service records"}
                        </p>
                    </CardHeader>

                    <CardContent>
                        <ServiceHistoryTimeline records={serviceHistory} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}