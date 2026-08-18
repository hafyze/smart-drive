import { Loader2, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";

import { Button } from "@/shared/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { toast } from "@/shared/components/ui/toast";

import { useDeleteVehicle } from "../hooks/useVehicles";
interface DeleteVehicleDialogProps {
    vehicle: {
        id: string;
        nickname: string;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted?: () => void;
}

export function DeleteVehicleDialog({
    vehicle,
    open,
    onOpenChange,
    onDeleted,
}: DeleteVehicleDialogProps) {
    const deleteVehicle = useDeleteVehicle();

    const handleDelete = async () => {
        try {
            await deleteVehicle.mutateAsync(vehicle.id);

            toast.add({
                title: "Vehicle deleted",
                description: `${vehicle.nickname} has been removed from your garage.`,
                type: "success",
            });

            onOpenChange(false);
            onDeleted?.();
        } catch (error) {
            let message =
                "Unable to delete the vehicle. Please try again.";

            if (isAxiosError(error)) {
                const detail = error.response?.data?.detail;

                if (typeof detail === "string") {
                    message = detail;
                }
            }

            toast.add({
                title: "Failed to delete vehicle",
                description: message,
                type: "error",
            });
        }
    };

    const handleOpenChange = (value: boolean) => {
        if (!deleteVehicle.isPending) {
            onOpenChange(value);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Delete Vehicle?
                    </DialogTitle>

                    <DialogDescription>
                        This will remove{" "}
                        <span className="font-medium text-foreground">
                            {vehicle.nickname}
                        </span>{" "}
                        from your garage. This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={deleteVehicle.isPending}
                        onClick={() =>
                            handleOpenChange(false)
                        }
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        disabled={deleteVehicle.isPending}
                        onClick={handleDelete}
                    >
                        {deleteVehicle.isPending && (
                            <Loader2 className="animate-spin" />
                        )}

                        {!deleteVehicle.isPending && (
                            <Trash2 />
                        )}

                        {deleteVehicle.isPending
                            ? "Deleting..."
                            : "Delete Vehicle"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}