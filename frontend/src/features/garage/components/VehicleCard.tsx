import { useState } from "react"
import { CarFront, Gauge, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/shared/components/ui/card";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

import type { VehicleListItem } from "../types/vehicle";
import { DeleteVehicleDialog } from "./DeleteVehicleDialog";

interface VehicleCardProps {
    vehicle: VehicleListItem;
}



export function VehicleCard({ vehicle }: VehicleCardProps) {
    const navigate = useNavigate()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    return (
        <div>
            <Card className="overflow-hidden">
            <div className="relative aspect-video bg-muted ">
                {vehicle.photo_url ? (
                    <img
                        src={vehicle.photo_url}
                        alt={`${vehicle.manufacturer} ${vehicle.model}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <CarFront className="size-12 text-muted-foreground" />
                    </div>
                )}

                <Badge className="absolute right-3 top-3">
                    {vehicle.status}
                </Badge>
            </div>

            <CardHeader className="pb-3">
                <div>
                    <h2 className="font-heading text-lg font-semibold">
                        {vehicle.nickname}
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        {vehicle.manufacturer} {vehicle.model}
                    </p>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <p className="text-sm">
                    {vehicle.variant}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <span>{vehicle.year}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Gauge className="size-4" />
                        {vehicle.current_mileage.toString()} km
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigate(`/garage/${vehicle.id}`)}>
                    View Vehicle
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Vehicle actions"
                            >
                                <MoreHorizontal />
                            </Button>
                        }
                    />

                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() =>
                                navigate(`/garage/${vehicle.id}`)
                            }
                        >
                            View Vehicle
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            Delete Vehicle
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>

        <DeleteVehicleDialog
            vehicle={vehicle}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
        />

        </div>
    )
}