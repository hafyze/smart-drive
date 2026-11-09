import { ArrowUpRight, CalendarClock, CarFront, Wrench, TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import type { DashboardStatistics as DashboardStatisticsData } from "../utils/dashboardData";

const cards = [
    { key: "vehicleCount", label: "Vehicles", description: "In your garage", icon: CarFront, color: "text-red-400", glow: "bg-red-500/10" },
    { key: "serviceRecordCount", label: "Service Records", description: "Saved visits across your garage", icon: Wrench, color: "text-red-400", glow: "bg-red-500/10" },
    { key: "upcomingCount", label: "Upcoming Maintenance", description: "Latest schedules not yet due", icon: CalendarClock, color: "text-amber-400", glow: "bg-amber-500/10" },
    { key: "overdueCount", label: "Overdue Maintenance", description: "Latest schedules needing attention", icon: TriangleAlert, color: "text-red-400", glow: "bg-red-500/10" },
] as const;

export function DashboardStatistics({
    statistics,
    vehiclesLoading,
    maintenanceLoading,
    serviceRecordsDescription,
    onSelect,
}: {
    statistics: DashboardStatisticsData;
    vehiclesLoading: boolean;
    maintenanceLoading: boolean;
    serviceRecordsDescription: string;
    onSelect: (key: typeof cards[number]["key"]) => void;
}) {
    return (
        <section aria-label="Ownership and maintenance statistics" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;
                const isVehicleStat = card.key === "vehicleCount";
                const loading = isVehicleStat ? vehiclesLoading : maintenanceLoading;
                const value = statistics[card.key];
                const description = card.key === "serviceRecordCount" ? serviceRecordsDescription : card.description;
                return (
                    <button
                        key={card.key}
                        type="button"
                        onClick={() => onSelect(card.key)}
                        aria-label={`${card.label}: ${value ?? "unavailable"}. ${description}`}
                        className="group rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                        <Card className="h-full border-white/10 bg-[#111315] text-white shadow-[0_15px_35px_-28px_rgba(0,0,0,0.95)] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-white/20 group-focus-visible:border-red-400/50">
                            <CardContent className="flex min-h-[105px] items-center gap-3 p-4 sm:gap-4 sm:p-5">
                                <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${card.glow} ${card.color}`}>
                                    <Icon className="size-6" aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-white/55">{card.label}</p>
                                    <p className="mt-0.5 font-heading text-3xl font-semibold leading-none">
                                        {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-white/10 align-middle" aria-label="Loading" /> : value ?? "—"}
                                    </p>
                                    <p className="mt-1 truncate text-[11px] text-white/40">{description}</p>
                                </div>
                                <ArrowUpRight className="size-4 shrink-0 text-white/35 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/75" aria-hidden="true" />
                            </CardContent>
                        </Card>
                    </button>
                );
            })}
        </section>
    );
}
