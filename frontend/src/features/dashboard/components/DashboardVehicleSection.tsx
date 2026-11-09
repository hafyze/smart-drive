import { ArrowRight, CarFront, Gauge } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { VehiclePhoto } from "@/features/garage/components/VehiclePhoto";
import type { VehicleListItem } from "@/features/garage/types/vehicle";

function formatStatus(value: string) {
    return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function VehicleCard({ vehicle }: { vehicle: VehicleListItem }) {
    return (
        <Link
            to={`/garage/${vehicle.id}`}
            aria-label={`View details for ${vehicle.nickname}, ${vehicle.manufacturer} ${vehicle.model}`}
            className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
            <Card className="h-full overflow-hidden border-white/10 bg-[#111315] text-white transition hover:border-white/20 group-focus-visible:border-red-400/50">
                <div className="relative aspect-[16/9] max-h-40 w-full overflow-hidden bg-[#1a1d20]">
                    <VehiclePhoto
                        photoUrl={vehicle.photo_url}
                        alt={`${vehicle.manufacturer} ${vehicle.model}`}
                        className="size-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <Badge className={vehicle.status === "ACTIVE"
                        ? "absolute right-2.5 top-2.5 border border-emerald-300/20 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/15"
                        : "absolute right-2.5 top-2.5 border border-white/15 bg-black/60 text-white hover:bg-black/60"}
                    >
                        {formatStatus(vehicle.status)}
                    </Badge>
                </div>
                <CardContent className="p-3.5">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="truncate font-heading text-base font-semibold">{vehicle.nickname}</h3>
                            <p className="truncate text-xs text-white/55">{vehicle.manufacturer} {vehicle.model}{vehicle.variant ? ` · ${vehicle.variant}` : ""}</p>
                        </div>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 transition group-hover:bg-red-500/15 group-hover:text-red-300">
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/65">
                        <span className="inline-flex items-center gap-1.5"><CarFront className="size-3.5 text-white/40" />{vehicle.year}</span>
                        <span className="inline-flex items-center gap-1.5"><Gauge className="size-3.5 text-white/40" />{vehicle.current_mileage.toLocaleString("en-MY")} km</span>
                    </div>
                    <span className="sr-only">Open vehicle details</span>
                </CardContent>
            </Card>
        </Link>
    );
}

export function DashboardVehicleSection({
    vehicles,
    isLoading,
    isError,
    onRetry,
}: {
    vehicles: VehicleListItem[] | undefined;
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
}) {
    return (
        <Card className="border-white/10 bg-[#101214] text-white shadow-[0_16px_38px_-28px_rgba(0,0,0,0.95)]">
            <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
                <div>
                    <h2 className="font-heading text-lg font-semibold">Your Vehicles</h2>
                    <p className="text-xs text-white/50">Quick access to your garage</p>
                </div>
                <Button variant="ghost" size="sm" render={<Link to="/garage" />} className="shrink-0 text-white/75 hover:bg-white/10 hover:text-white">
                    View Garage <ArrowRight className="size-4" />
                </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">
                {isLoading && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {[0, 1].map((key) => <div key={key} className="overflow-hidden rounded-2xl border border-white/10"><div className="aspect-[16/9] animate-pulse bg-white/[0.06]" /><div className="space-y-2 p-3"><div className="h-4 w-28 animate-pulse rounded bg-white/10" /><div className="h-3 w-40 animate-pulse rounded bg-white/[0.07]" /></div></div>)}
                    </div>
                )}
                {isError && (
                    <div className="flex min-h-48 flex-col items-center justify-center text-center">
                        <p className="text-sm text-white/60">Unable to load your vehicles.</p>
                        <Button variant="ghost" size="sm" onClick={onRetry} className="mt-2 text-red-300 hover:bg-red-500/10 hover:text-red-200">Try again</Button>
                    </div>
                )}
                {!isLoading && !isError && vehicles?.length === 0 && (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 p-5 text-center">
                        <CarFront className="size-8 text-white/35" aria-hidden="true" />
                        <h3 className="mt-3 font-heading font-semibold">Your garage is waiting</h3>
                        <p className="mt-1 max-w-xs text-xs leading-5 text-white/50">Add your first vehicle to track its service history and maintenance.</p>
                        <Button variant="outline" size="sm" render={<Link to="/garage" />} className="mt-3 border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white">Add a vehicle</Button>
                    </div>
                )}
                {!isLoading && !isError && vehicles && vehicles.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {vehicles.slice(0, 2).map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
