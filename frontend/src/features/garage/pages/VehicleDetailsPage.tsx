import { useRef } from "react";
import { Activity, BrainCircuit, FileText, Gauge, Wrench } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";

import { Card, CardContent } from "@/shared/components/ui/card";
import { useMaintenance } from "@/features/maintenance/hooks/useMaintenance";
import { useServiceHistory } from "@/features/maintenance/hooks/useServiceHistory";
import { useVehicle } from "../hooks/useVehicles";
import { VehicleHero } from "../components/vehicle-details/VehicleHero";
import { VehicleOverviewTab } from "../components/vehicle-details/VehicleOverviewTab";
import { VehicleServiceHistoryTab } from "../components/vehicle-details/VehicleServiceHistoryTab";
import { VehicleMaintenanceTab } from "../components/vehicle-details/VehicleMaintenanceTab";
import { VehicleInsightsTab } from "../components/vehicle-details/VehicleInsightsTab";
import { VehicleDocumentsTab } from "../components/vehicle-details/VehicleDocumentsTab";

const DETAIL_TABS = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "history", label: "Service History", icon: Wrench },
    { id: "maintenance", label: "Maintenance", icon: Gauge },
    { id: "insights", label: "Insights", icon: BrainCircuit },
    { id: "documents", label: "Documents", icon: FileText },
] as const;

type DetailTab = (typeof DETAIL_TABS)[number]["id"];

function VehicleDetailsLoading() {
    return (
        <div className="dark min-h-[calc(100vh-4rem)] space-y-5 bg-[#0b0d0f] p-4 text-white sm:p-6">
            <div className="h-[350px] animate-pulse rounded-2xl bg-muted sm:h-[390px]" />
            <div className="grid gap-3 sm:grid-cols-5">{DETAIL_TABS.map((tab) => <div key={tab.id} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
            <Card><CardContent className="h-64 animate-pulse p-6" /></Card>
        </div>
    );
}

export default function VehicleDetailsPage() {
    const { vehicleId = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const requestedTab = searchParams.get("tab");
    const activeTab: DetailTab = DETAIL_TABS.some((tab) => tab.id === requestedTab)
        ? requestedTab as DetailTab
        : "overview";

    const { data: vehicle, isLoading: vehicleLoading, isError: vehicleError, error } = useVehicle(vehicleId);
    const { data: visits, isLoading: visitsLoading, isError: visitsError, refetch: refetchVisits } = useMaintenance(vehicle?.id);
    const { data: serviceHistory, isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useServiceHistory(vehicle?.id ?? "");

    const selectTab = (tab: DetailTab) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (tab === "overview") next.delete("tab");
            else next.set("tab", tab);
            return next;
        });
    };

    if (vehicleLoading) return <VehicleDetailsLoading />;

    if (vehicleError || !vehicle) {
        return (
            <div className="dark min-h-[calc(100vh-4rem)] space-y-5 bg-[#0b0d0f] p-4 text-white sm:p-6">
                <Card><CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
                    <h1 className="font-heading text-xl font-semibold">Unable to load vehicle</h1>
                    <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "The vehicle could not be found."}</p>
                </CardContent></Card>
            </div>
        );
    }

    return (
        <div className="dark min-h-[calc(100vh-4rem)] min-w-0 space-y-5 bg-[#0b0d0f] p-3 text-white sm:space-y-6 sm:p-6">
            <VehicleHero vehicle={vehicle} />

            <nav aria-label="Vehicle details" className="-mx-3 overflow-x-auto border-b border-border/70 px-3 sm:mx-0 sm:px-0">
                <div role="tablist" aria-label="Vehicle details sections" className="flex min-w-max gap-1">
                    {DETAIL_TABS.map((tab, index) => {
                        const Icon = tab.icon;
                        const selected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                ref={(element) => { tabRefs.current[index] = element; }}
                                id={`vehicle-tab-${tab.id}`}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                aria-controls={`vehicle-panel-${tab.id}`}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => selectTab(tab.id)}
                                onKeyDown={(event) => {
                                    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
                                    if (!keys.includes(event.key)) return;
                                    event.preventDefault();
                                    const nextIndex = event.key === "Home" ? 0
                                        : event.key === "End" ? DETAIL_TABS.length - 1
                                            : (index + (event.key === "ArrowRight" ? 1 : -1) + DETAIL_TABS.length) % DETAIL_TABS.length;
                                    const nextTab = DETAIL_TABS[nextIndex];
                                    if (nextTab) {
                                        tabRefs.current[nextIndex]?.focus();
                                        selectTab(nextTab.id);
                                    }
                                }}
                                className={`flex min-h-12 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors sm:px-5 ${selected ? "border-red-500 text-red-500" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            >
                                <Icon className="size-4" aria-hidden="true" />{tab.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <section
                id={`vehicle-panel-${activeTab}`}
                role="tabpanel"
                aria-labelledby={`vehicle-tab-${activeTab}`}
                tabIndex={0}
                className="min-w-0 outline-none"
            >
                {activeTab === "overview" && (visitsLoading || historyLoading) && (
                    <Card><CardContent className="flex min-h-48 items-center justify-center p-6 text-sm text-muted-foreground">Loading vehicle records…</CardContent></Card>
                )}
                {activeTab === "overview" && (visitsError || historyError) && (
                    <Card><CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
                        <p className="text-sm text-destructive">Unable to load service data for the overview.</p>
                        <div className="flex gap-2">
                            {visitsError && <button type="button" className="text-sm text-red-500 underline" onClick={() => void refetchVisits()}>Retry maintenance</button>}
                            {historyError && <button type="button" className="text-sm text-red-500 underline" onClick={() => void refetchHistory()}>Retry history</button>}
                        </div>
                    </CardContent></Card>
                )}
                {activeTab === "overview" && !visitsLoading && !historyLoading && !visitsError && !historyError && (
                    <VehicleOverviewTab vehicle={vehicle} visits={visits ?? []} serviceHistory={serviceHistory ?? []} onSelectTab={selectTab} />
                )}
                {activeTab === "history" && <VehicleServiceHistoryTab vehicleId={vehicle.id} />}
                {activeTab === "maintenance" && <VehicleMaintenanceTab vehicle={vehicle} visits={visits ?? []} isLoading={visitsLoading} isError={visitsError} />}
                {activeTab === "insights" && <VehicleInsightsTab vehicleId={vehicle.id} />}
                {activeTab === "documents" && <VehicleDocumentsTab vehicleId={vehicle.id} />}
            </section>
        </div>
    );
}
