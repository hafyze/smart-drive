import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    CalendarDays,
    CarFront,
    CheckCircle2,
    Grid2X2,
    List,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    Wrench,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { useAllMaintenance } from "@/features/maintenance/hooks/useMaintenance";
import { useVehicles } from "../hooks/useVehicles";
import { AddVehicleDialog } from "../components/AddVehicleDialog";
import { VehicleCard } from "../components/VehicleCard";
import { filterGarageVehicles, getGarageStatistics } from "../utils/garageData";

type GarageView = "grid" | "list";

function readInitialView(): GarageView {
    try {
        return window.localStorage.getItem("smart-drive-garage-view") === "list" ? "list" : "grid";
    } catch {
        return "grid";
    }
}

function GarageStat({
    icon: Icon,
    label,
    value,
    description,
    loading,
}: {
    icon: typeof CarFront;
    label: string;
    value: number | null;
    description: string;
    loading: boolean;
}) {
    return (
        <Card className="border-white/10 bg-[#111315]/90 text-white shadow-[0_14px_35px_-28px_rgba(0,0,0,0.95)]">
            <CardContent className="flex min-w-0 items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/[0.08] text-red-400 sm:size-11">
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/45 sm:text-xs">{label}</p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-semibold leading-none sm:text-3xl">
                            {loading ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-white/10 align-middle" aria-label="Loading" /> : value ?? "—"}
                        </span>
                        <span className="hidden truncate text-xs text-white/45 md:inline">{description}</span>
                    </div>
                    <span className="mt-1 block truncate text-[11px] text-white/45 md:hidden">{description}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function GarageCardSkeleton() {
    return (
        <Card className="overflow-hidden border-white/10 bg-[#111315]">
            <div className="aspect-[16/9] animate-pulse bg-white/[0.06]" />
            <CardContent className="space-y-4 p-4">
                <div className="h-5 w-36 animate-pulse rounded bg-white/[0.08]" />
                <div className="h-4 w-48 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-10 animate-pulse rounded-full bg-white/[0.06]" />
            </CardContent>
        </Card>
    );
}

function AddVehicleCard({ onClick, view }: { onClick: () => void; view: GarageView }) {
    const isList = view === "list";
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group relative flex w-full overflow-hidden rounded-2xl border border-dashed border-white/20 bg-[#101214] text-white transition hover:border-red-400/50 hover:bg-[#141517] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${isList ? "min-h-24 items-center justify-start gap-4 px-5 py-4 text-left" : "min-h-[380px] flex-col items-center justify-center px-6 py-8 text-center sm:min-h-[400px]"}`}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_100%,rgba(239,68,68,0.14),transparent_45%)] opacity-70 transition group-hover:opacity-100" />
            <span className={`relative flex shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.04] text-white transition group-hover:border-red-400/40 group-hover:text-red-300 ${isList ? "size-11" : "size-14"}`}>
                <Plus className={isList ? "size-5" : "size-7"} aria-hidden="true" />
            </span>
            <span className={isList ? "relative min-w-0" : "relative mt-4"}>
                <span className="block font-heading text-lg font-semibold">Add a Vehicle</span>
                <span className={`mt-1 block text-sm leading-6 text-white/55 ${isList ? "" : "max-w-56"}`}>Start tracking maintenance, service history and more.</span>
            </span>
            {!isList && <CarFront className="pointer-events-none absolute -bottom-9 -right-6 size-40 -rotate-12 text-red-400/[0.06] transition group-hover:text-red-400/[0.1]" aria-hidden="true" />}
        </button>
    );
}

function EmptyGarage({ onAddVehicle }: { onAddVehicle: () => void }) {
    return (
        <Card className="relative overflow-hidden border-white/10 bg-[#111315] text-white">
            <CardContent className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden p-8 text-center">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(239,68,68,0.12),transparent_52%)]" />
                <span className="relative flex size-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/[0.08] text-red-400">
                    <CarFront className="size-8" aria-hidden="true" />
                </span>
                <h2 className="relative mt-5 font-heading text-2xl font-semibold">Your garage is waiting.</h2>
                <p className="relative mt-2 max-w-md text-sm leading-6 text-white/55">Add your first vehicle to keep its service history, maintenance schedule and important details in one place.</p>
                <Button type="button" onClick={onAddVehicle} className="relative mt-6 h-11 rounded-full bg-red-600 px-5 text-white hover:bg-red-500">
                    <Plus className="size-4" /> Add Your First Vehicle
                </Button>
            </CardContent>
        </Card>
    );
}

export default function GaragePage() {
    const [search, setSearch] = useState("");
    const [view, setView] = useState<GarageView>(readInitialView);
    const [addVehicleOpen, setAddVehicleOpen] = useState(false);
    const {
        data: vehicles,
        isLoading: isVehiclesLoading,
        isFetching: isVehiclesFetching,
        isError: isVehiclesError,
        error: vehiclesError,
        refetch: refetchVehicles,
    } = useVehicles();
    const {
        data: visits,
        isLoading: isVisitsLoading,
        isError: isVisitsError,
        refetch: refetchVisits,
    } = useAllMaintenance();

    useEffect(() => {
        try {
            window.localStorage.setItem("smart-drive-garage-view", view);
        } catch {
            // The view control still works when browser storage is unavailable.
        }
    }, [view]);

    const statistics = useMemo(() => getGarageStatistics(vehicles, visits), [vehicles, visits]);
    const visibleVehicles = useMemo(
        () => filterGarageVehicles(vehicles ?? [], search),
        [vehicles, search],
    );

    return (
        <div className="dark min-h-[calc(100vh-4rem)] min-w-0 space-y-5 bg-[#0b0d0f] p-3 text-white sm:space-y-6 sm:p-5 lg:p-7">
            <section className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#101214] sm:rounded-3xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_40%,rgba(239,68,68,0.14),transparent_38%),linear-gradient(115deg,transparent_0%,rgba(127,29,29,0.08)_38%,transparent_58%)]" />
                <div className="pointer-events-none absolute -right-6 -top-16 h-[26rem] w-[38%] -skew-x-[25deg] border-l border-red-400/[0.08] bg-gradient-to-br from-red-500/[0.07] to-transparent" />
                <CarFront className="pointer-events-none absolute -right-5 top-1/2 hidden size-[20rem] -translate-y-1/2 rotate-[-5deg] text-white/[0.035] sm:block" strokeWidth={0.7} aria-hidden="true" />
                <div className="relative flex min-h-[205px] flex-col justify-between gap-6 p-5 sm:min-h-[230px] sm:flex-row sm:items-end sm:p-7 lg:px-9 lg:py-8">
                    <div className="max-w-2xl">
                        <div className="mb-4 flex items-center gap-2 text-xs text-white/45">
                            <Link to="/dashboard" className="transition hover:text-white">Dashboard</Link>
                            <span aria-hidden="true">/</span>
                            <span className="text-white/75">Garage</span>
                        </div>
                        <Badge className="mb-2 border border-red-400/20 bg-red-500/[0.08] text-[10px] tracking-[0.18em] text-red-300 hover:bg-red-500/[0.08]">SMARTDRIVE GARAGE</Badge>
                        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem]">My Garage</h1>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/60 sm:text-base">Manage your vehicles, track maintenance, and keep them in top condition.</p>
                    </div>
                    <Button type="button" onClick={() => setAddVehicleOpen(true)} className="h-11 shrink-0 rounded-full bg-red-600 px-5 text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500">
                        <Plus className="size-4" /> Add Vehicle
                    </Button>
                </div>
            </section>

            <section aria-label="Garage statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <GarageStat icon={CarFront} label="Vehicles" value={statistics.vehicleCount} description={vehicles ? "In your garage" : "Unavailable"} loading={isVehiclesLoading} />
                <GarageStat icon={Wrench} label="Service Records" value={statistics.serviceRecordCount} description={visits && vehicles ? "Recorded service visits" : "Unavailable"} loading={isVisitsLoading} />
                <GarageStat icon={CalendarDays} label="Upcoming Services" value={statistics.upcomingServiceCount} description={visits && vehicles ? "Saved schedules not yet due" : "Unavailable"} loading={isVisitsLoading} />
            </section>
            <p className="-mt-3 text-[11px] leading-5 text-white/40">
                Service records count saved visits for vehicles in this garage; removed visits and vehicles are excluded. Upcoming services count only saved maintenance items marked Upcoming.
            </p>

            <section aria-label="Vehicle collection" className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
                        <Input
                            aria-label="Search vehicles"
                            placeholder="Search by name, make, model or plate…"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="h-11 rounded-full border-white/10 bg-[#111315] pl-11 text-white placeholder:text-white/35 focus-visible:border-red-400/50 focus-visible:ring-red-400/20"
                        />
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                        {isVehiclesFetching && !isVehiclesLoading && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-white/45" role="status">
                                <Loader2 className="size-3.5 animate-spin" /> Refreshing
                            </span>
                        )}
                        <div role="group" aria-label="Vehicle display mode" className="flex rounded-full border border-white/10 bg-white/[0.035] p-1">
                            <Button type="button" variant="ghost" size="icon" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={`size-9 rounded-full ${view === "grid" ? "bg-red-600 text-white hover:bg-red-500 hover:text-white" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>
                                <Grid2X2 className="size-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")} className={`size-9 rounded-full ${view === "list" ? "bg-red-600 text-white hover:bg-red-500 hover:text-white" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>
                                <List className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {isVehiclesLoading && (
                    <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
                        {[0, 1, 2].map((item) => <GarageCardSkeleton key={item} />)}
                    </div>
                )}

                {isVehiclesError && !vehicles && (
                    <Card className="border-red-400/20 bg-[#111315] text-white">
                        <CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
                            <span className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-300"><CarFront className="size-6" /></span>
                            <h2 className="mt-4 font-heading text-xl font-semibold">Unable to load your garage</h2>
                            <p className="mt-2 max-w-md text-sm text-white/55">{vehiclesError instanceof Error ? vehiclesError.message : "Something went wrong while loading your vehicles."}</p>
                            <Button type="button" variant="outline" onClick={() => void refetchVehicles()} className="mt-5 border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white">
                                <RefreshCw className="size-4" /> Try again
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {!isVehiclesLoading && vehicles?.length === 0 && (
                    <EmptyGarage onAddVehicle={() => setAddVehicleOpen(true)} />
                )}

                {!isVehiclesLoading && vehicles && vehicles.length > 0 && (
                    visibleVehicles.length > 0 ? (
                        <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
                            {visibleVehicles.map((vehicle) => (
                                <VehicleCard key={vehicle.id} vehicle={vehicle} view={view} />
                            ))}
                            <AddVehicleCard view={view} onClick={() => setAddVehicleOpen(true)} />
                        </div>
                    ) : (
                        <Card className="border-white/10 bg-[#111315] text-white">
                            <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
                                <Search className="size-7 text-white/30" aria-hidden="true" />
                                <h2 className="mt-3 font-heading text-lg font-semibold">No vehicles match that search</h2>
                                <p className="mt-1 text-sm text-white/50">Try a different name, make, model or plate number.</p>
                                <Button type="button" variant="ghost" onClick={() => setSearch("")} className="mt-3 text-red-300 hover:bg-red-500/10 hover:text-red-200">Clear search</Button>
                            </CardContent>
                        </Card>
                    )
                )}
            </section>

            {isVehiclesError && vehicles && (
                <Card className="border-amber-300/15 bg-[#111315] text-white">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                        <p className="text-sm text-white/65">Showing saved vehicle data; refresh did not complete.</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => void refetchVehicles()} className="shrink-0 border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white">
                            <RefreshCw className="size-3.5" /> Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isVisitsError && (
                <Card className="border-white/10 bg-[#111315] text-white">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-white/40" />
                            <div>
                                <p className="text-sm font-medium">Service statistics are unavailable</p>
                                <p className="text-xs text-white/50">{visits ? "Showing saved maintenance data; refresh did not complete." : "Your vehicle collection loaded. Retry maintenance data to refresh the counts."}</p>
                            </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => void refetchVisits()} className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white">
                            <ArrowRight className="size-3.5" /> Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            <AddVehicleDialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen} />
        </div>
    );
}
