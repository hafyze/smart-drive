import { useState } from "react";
import { ArrowUpRight, CarFront, Fuel, Gauge, Settings2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/components/ui/card";
import type { VehicleListItem } from "../types/vehicle";
import { DeleteVehicleDialog } from "./DeleteVehicleDialog";
import { VehicleEditAction } from "./VehicleEditAction";
import { VehiclePhoto } from "./VehiclePhoto";

interface VehicleCardProps {
    vehicle: VehicleListItem;
    view?: "grid" | "list";
}

function formatEnum(value?: string | null) {
    return value?.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function StatusBadge({ status }: { status: VehicleListItem["status"] }) {
    const isActive = status === "ACTIVE";
    return (
        <Badge className={isActive
            ? "border border-emerald-300/20 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/15"
            : "border border-white/15 bg-black/60 text-white/90 hover:bg-black/60"}
        >
            {formatEnum(status)}
        </Badge>
    );
}

export function VehicleCard({ vehicle, view = "grid" }: VehicleCardProps) {
    const navigate = useNavigate();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const detailsPath = `/garage/${vehicle.id}`;

    if (view === "list") {
        return (
            <>
                <Card className="border-white/10 bg-[#111315] text-white shadow-[0_16px_36px_-28px_rgba(0,0,0,0.9)] transition-colors hover:border-white/20">
                    <div className="flex flex-col gap-4 p-3 sm:flex-row sm:items-center sm:p-4">
                        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-[#1b1e20] sm:h-24 sm:w-36 sm:aspect-auto">
                            <VehiclePhoto
                                photoUrl={vehicle.photo_url}
                                alt={`${vehicle.manufacturer} ${vehicle.model}`}
                                className="size-full object-cover"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h2 className="truncate font-heading text-lg font-semibold">{vehicle.nickname}</h2>
                                    <p className="truncate text-sm text-white/60">{vehicle.manufacturer} {vehicle.model}{vehicle.variant ? ` · ${vehicle.variant}` : ""}</p>
                                </div>
                                <StatusBadge status={vehicle.status} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
                                <span className="inline-flex items-center gap-2"><CarFront className="size-4 text-white/45" />{vehicle.year}</span>
                                <span className="inline-flex items-center gap-2"><Gauge className="size-4 text-white/45" />{vehicle.current_mileage.toLocaleString()} km</span>
                                {vehicle.fuel_type && <span className="inline-flex items-center gap-2"><Fuel className="size-4 text-white/45" />{formatEnum(vehicle.fuel_type)}</span>}
                                {vehicle.transmission && <span className="inline-flex items-center gap-2"><Settings2 className="size-4 text-white/45" />{formatEnum(vehicle.transmission)}</span>}
                                {vehicle.plate_number && <span className="text-white/45">{vehicle.plate_number}</span>}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:pl-2">
                            <Button type="button" variant="outline" onClick={() => navigate(detailsPath)} className="h-10 flex-1 border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white sm:flex-none">
                                Details <ArrowUpRight className="ml-1 size-4" />
                            </Button>
                            <VehicleEditAction vehicleId={vehicle.id} nickname={vehicle.nickname} />
                            <Button type="button" variant="outline" size="icon" aria-label={`Remove ${vehicle.nickname}`} title="Remove vehicle" onClick={() => setDeleteDialogOpen(true)} className="size-10 border-white/10 bg-white/[0.04] text-white hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300">
                                <Trash2 />
                            </Button>
                        </div>
                    </div>
                </Card>
                <DeleteVehicleDialog vehicle={vehicle} open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
            </>
        );
    }

    return (
        <>
            <Card className="group relative border-white/10 bg-[#111315] text-white shadow-[0_18px_40px_-30px_rgba(0,0,0,0.95)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_48px_-30px_rgba(0,0,0,1)]">
                <div className="relative aspect-[16/9] max-h-64 w-full overflow-hidden bg-[#1b1e20]">
                    <VehiclePhoto
                        photoUrl={vehicle.photo_url}
                        alt={`${vehicle.manufacturer} ${vehicle.model}`}
                        className="size-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
                    <div className="absolute right-3 top-3"><StatusBadge status={vehicle.status} /></div>
                </div>

                <CardHeader className="gap-1 pb-1 pt-4">
                    <h2 className="truncate font-heading text-xl font-semibold tracking-tight">{vehicle.nickname}</h2>
                    <p className="truncate text-sm text-white/60">{vehicle.manufacturer} {vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ""}</p>
                </CardHeader>

                <CardContent className="grid grid-cols-2 gap-x-3 gap-y-3 pt-3 text-sm text-white/75">
                    <span className="inline-flex min-w-0 items-center gap-2"><CarFront className="size-4 shrink-0 text-white/45" />{vehicle.year}</span>
                    <span className="inline-flex min-w-0 items-center gap-2"><Gauge className="size-4 shrink-0 text-white/45" /><span className="truncate">{vehicle.current_mileage.toLocaleString()} km</span></span>
                    {vehicle.fuel_type && <span className="inline-flex min-w-0 items-center gap-2"><Fuel className="size-4 shrink-0 text-white/45" />{formatEnum(vehicle.fuel_type)}</span>}
                    {vehicle.transmission && <span className="inline-flex min-w-0 items-center gap-2"><Settings2 className="size-4 shrink-0 text-white/45" />{formatEnum(vehicle.transmission)}</span>}
                </CardContent>

                <CardFooter className="mt-1 gap-2 border-t border-white/[0.07] pt-3">
                    <Button type="button" onClick={() => navigate(detailsPath)} className="h-10 flex-1 justify-between rounded-full bg-white/[0.08] px-4 text-white hover:bg-white/[0.14]">
                        View Details <ArrowUpRight className="size-4" />
                    </Button>
                    <VehicleEditAction vehicleId={vehicle.id} nickname={vehicle.nickname} />
                    <Button type="button" variant="outline" size="icon" aria-label={`Remove ${vehicle.nickname}`} title="Remove vehicle" onClick={() => setDeleteDialogOpen(true)} className="size-10 border-white/10 bg-white/[0.04] text-white hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300">
                        <Trash2 />
                    </Button>
                </CardFooter>
            </Card>
            <DeleteVehicleDialog vehicle={vehicle} open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
        </>
    );
}
