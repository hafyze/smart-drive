import { CarFront, Gauge } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/shared/components/ui/card";

import type { VehicleListItem } from "@/features/garage/types/vehicle";

interface VehicleOverviewCardProps {
    vehicle: VehicleListItem;
}

export function VehicleOverviewCard({
    vehicle,
}: VehicleOverviewCardProps) {
    const navigate = useNavigate();

    return (
        <Card>
            {/* Vehicle Image */}
            <div>
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

            {/* Vehicle Info */}
            <CardHeader className="pb-3">
                <h2 className="font-heading text-lg font-semibold">
                    {vehicle.nickname}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {vehicle.manufacturer} {vehicle.model}
                </p>
            </CardHeader>

            <CardContent className="space-y-3">
                <p className="text-sm">
                    {vehicle.variant}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{vehicle.year}</span>

                    <div className="flex items-center gap-1.5">
                        <Gauge className="size-4" />
                        {vehicle.current_mileage.toLocaleString()} km
                    </div>
                </div>
            </CardContent>

            {/* Action */}

            <CardFooter>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/garage/${vehicle.id}`)}
                >
                    View Vehicle
                </Button>
            </CardFooter>
        </Card>
    );
}