import { ArrowLeft, Fuel, Gauge, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { VehicleResponse } from "../../types/vehicle";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { EditVehicleDialog } from "../EditVehicleDialog";
import { VehiclePhoto } from "../VehiclePhoto";

function formatEnum(value: string) {
    return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function VehicleHero({ vehicle }: { vehicle: VehicleResponse }) {
    const navigate = useNavigate();
    return (
        <section className="relative isolate min-h-[350px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d0f] text-white sm:min-h-[390px]">
            <VehiclePhoto
                photoUrl={vehicle.photo_url}
                alt={`${vehicle.manufacturer} ${vehicle.model}`}
                className="absolute inset-0 size-full object-cover object-center opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/15" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/25" />
            <div className="absolute -left-12 top-0 h-full w-1/3 -skew-x-[26deg] border-r border-red-500/20 bg-gradient-to-r from-red-600/20 to-transparent" aria-hidden="true" />

            <div className="relative flex min-h-[350px] flex-col justify-between p-5 sm:min-h-[390px] sm:p-8">
                <div className="flex items-start justify-between gap-3">
                    <Button variant="ghost" onClick={() => navigate("/garage")} className="text-white hover:bg-white/10 hover:text-white">
                        <ArrowLeft className="size-4" /> Garage
                    </Button>
                    <div className="flex items-center gap-2">
                        <Badge className="border border-emerald-300/20 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20">{formatEnum(vehicle.status)}</Badge>
                        <EditVehicleDialog vehicle={vehicle} />
                    </div>
                </div>

                <div className="max-w-xl space-y-4">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">{vehicle.manufacturer}</p>
                        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl">{vehicle.model} <span className="font-medium text-white/75">{vehicle.variant}</span></h1>
                        <p className="text-base text-white/75 sm:text-lg">{vehicle.nickname}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{vehicle.year}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><Fuel className="size-3.5" />{formatEnum(vehicle.fuel_type)}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><Settings2 className="size-3.5" />{formatEnum(vehicle.transmission)}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><Gauge className="size-3.5" />{vehicle.current_mileage.toLocaleString("en-MY")} km</span>
                    </div>

                </div>
            </div>
        </section>
    );
}
