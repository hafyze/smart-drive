import { Gauge } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/shared/components/ui/card";

import type { VehicleListItem } from "@/features/garage/types/vehicle";
import { VehiclePhoto } from "@/features/garage/components/VehiclePhoto";

interface VehicleOverviewCardProps {
    vehicle: VehicleListItem;
}

export function VehicleOverviewCard({
    vehicle,
}: VehicleOverviewCardProps) {
    const navigate = useNavigate();

    return (
        <Card className="relative transition-colors hover:ring-primary/40">
            <Link
                to={`/garage/${vehicle.id}`}
                className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`View ${vehicle.nickname}`}
            />
            {/* Vehicle Image */}
            <div>
                <VehiclePhoto
                    photoUrl={vehicle.photo_url}
                    alt={`${vehicle.manufacturer} ${vehicle.model}`}
                    className="h-full w-full object-cover"
                />

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
                    className="relative z-20"
                    onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/garage/${vehicle.id}`);
                    }}
                >
                    View Vehicle
                </Button>
            </CardFooter>
        </Card>
    );
}
