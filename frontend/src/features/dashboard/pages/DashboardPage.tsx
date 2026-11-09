import { useMemo, useState } from "react";
import { CarFront } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useVehicles } from "@/features/garage/hooks/useVehicles";
import { useAllMaintenance } from "@/features/maintenance/hooks/useMaintenance";
import { DashboardStatistics } from "../components/DashboardStatistics";
import { DashboardVehicleSection } from "../components/DashboardVehicleSection";
import { MaintenanceHealthCard } from "../components/MaintenanceHealthCard";
import { MaintenanceStatusDistribution } from "../components/MaintenanceStatusDistribution";
import { MaintenanceScheduleSections } from "../components/MaintenanceScheduleSections";
import { MileageTrendChart } from "../components/MileageTrendChart";
import { getDashboardMaintenanceRecords, getDashboardStatistics, getMaintenanceDistribution, sortOverdueMaintenance, sortUpcomingMaintenance } from "../utils/dashboardData";
import type { VehicleListItem } from "@/features/garage/types/vehicle";

const EMPTY_VEHICLES: VehicleListItem[] = [];

export default function DashboardPage() {
    const navigate = useNavigate();
    const vehiclesQuery = useVehicles();
    const maintenanceQuery = useAllMaintenance();
    const vehicles = vehiclesQuery.data ?? EMPTY_VEHICLES;
    const [focusedVehicleId, setFocusedVehicleId] = useState("");
    const selectedVehicleId = vehicles.some((vehicle) => vehicle.id === focusedVehicleId) ? focusedVehicleId : vehicles[0]?.id ?? "";

    const latestRecords = useMemo(() => getDashboardMaintenanceRecords(vehicles, maintenanceQuery.data ?? []), [vehicles, maintenanceQuery.data]);
    const distribution = useMemo(() => getMaintenanceDistribution(latestRecords), [latestRecords]);
    const upcoming = useMemo(() => sortUpcomingMaintenance(latestRecords), [latestRecords]);
    const overdue = useMemo(() => sortOverdueMaintenance(latestRecords), [latestRecords]);
    const statistics = getDashboardStatistics(vehiclesQuery.data, maintenanceQuery.data);

    const selectStat = (key: "vehicleCount" | "serviceRecordCount" | "upcomingCount" | "overdueCount") => {
        if (key === "vehicleCount") return navigate("/garage");
        const records = key === "upcomingCount" ? upcoming : key === "overdueCount" ? overdue : latestRecords;
        if (records[0]) {
            navigate(`/garage/${records[0].vehicle.id}?tab=${key === "serviceRecordCount" ? "history" : "maintenance"}`);
        } else navigate(key === "serviceRecordCount" ? "/garage" : "/maintenance");
    };

    return <main className="space-y-4 p-3 text-white sm:space-y-5 sm:p-5 xl:p-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_75%_20%,rgba(244,63,94,.18),transparent_40%),linear-gradient(115deg,#171114,#101214_48%,#171a1e)] px-4 py-5 sm:px-6 sm:py-7">
            <div className="pointer-events-none absolute -right-5 -top-12 opacity-[0.06]"><CarFront className="size-56"/></div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">SmartDrive overview</p>
            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">Welcome back</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/55">Your vehicles, service schedules, and maintenance at a glance.</p>
        </section>

        <DashboardStatistics statistics={statistics} vehiclesLoading={vehiclesQuery.isLoading} maintenanceLoading={maintenanceQuery.isLoading} serviceRecordsDescription="Saved visits across your active garage" onSelect={selectStat}/>

        <section className="grid gap-3 xl:grid-cols-[1.35fr_1fr_1fr]">
            <DashboardVehicleSection vehicles={vehiclesQuery.data} isLoading={vehiclesQuery.isLoading} isError={vehiclesQuery.isError} onRetry={() => void vehiclesQuery.refetch()}/>
            <MaintenanceHealthCard vehicles={vehicles} visits={maintenanceQuery.data} selectedVehicleId={selectedVehicleId} onVehicleChange={setFocusedVehicleId} isLoading={maintenanceQuery.isLoading} isError={maintenanceQuery.isError} onRetry={() => void maintenanceQuery.refetch()}/>
            <MaintenanceStatusDistribution distribution={distribution} isLoading={maintenanceQuery.isLoading} isError={maintenanceQuery.isError}/>
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.05fr_1.05fr_1.2fr]">
            <MaintenanceScheduleSections upcoming={upcoming} overdue={overdue} isLoading={maintenanceQuery.isLoading} isError={maintenanceQuery.isError} onRetry={() => void maintenanceQuery.refetch()}/>
            <MileageTrendChart vehicles={vehicles} visits={maintenanceQuery.data} selectedVehicleId={selectedVehicleId} onVehicleChange={setFocusedVehicleId} isLoading={maintenanceQuery.isLoading} isError={maintenanceQuery.isError}/>
        </section>

    </main>;
}
