import { useMemo } from "react";
import { Activity, AlertTriangle, CalendarClock, Gauge, ShieldCheck, Wrench } from "lucide-react";

import type { VehicleListItem } from "@/features/garage/types/vehicle";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import type { ServiceVisit } from "../types/maintenance";
import { calculateAreas, calculateOverallScore, STATUS_CONTENT, TYPE_LABELS } from "../utils/maintenanceScore";

export function MaintenanceScoreContent({
    vehicle,
    visits,
}: {
    vehicle: Pick<VehicleListItem, "current_mileage">;
    visits: ServiceVisit[];
}) {
    const areas = useMemo(() => calculateAreas(vehicle, visits), [vehicle, visits]);
    const { eligibleCount, score } = calculateOverallScore(areas);

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
                                ? `Only ${eligibleCount} of 6 areas have a saved next-due schedule. Add schedules for at least two areas to calculate a score.`
                                : `Based on ${eligibleCount} of 6 areas with saved next-due schedules. Areas without schedule data are excluded.`}
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
