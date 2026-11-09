import { useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/components/ui/toastManager";
import { vehicleApi } from "../api/vehicleApi";
import type { VehicleResponse } from "../types/vehicle";
import { EditVehicleDialog } from "./EditVehicleDialog";

export function VehicleEditAction({ vehicleId, nickname }: { vehicleId: string; nickname: string }) {
    const queryClient = useQueryClient();
    const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const openEditor = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const fullVehicle = await queryClient.fetchQuery({
                queryKey: ["vehicles", vehicleId],
                queryFn: () => vehicleApi.getById(vehicleId),
            });
            setVehicle(fullVehicle);
            setOpen(true);
        } catch (error) {
            const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.add({
                title: "Unable to load vehicle",
                description: typeof detail === "string" ? detail : "Try opening the editor again.",
                type: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Edit ${nickname}`}
                title="Edit vehicle"
                disabled={isLoading}
                onClick={() => void openEditor()}
                className="size-10 border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : <Pencil />}
            </Button>
            {vehicle && (
                <EditVehicleDialog
                    vehicle={vehicle}
                    open={open}
                    onOpenChange={(nextOpen) => {
                        setOpen(nextOpen);
                        if (!nextOpen) setVehicle(null);
                    }}
                />
            )}
        </>
    );
}
