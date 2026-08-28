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
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { toast } from "@/shared/components/ui/toast";

import { useDeleteMaintenance } from "../hooks/useMaintenance";
import type { MaintenanceListItem } from "../types/maintenance";
import { useState } from "react";

interface DeleteMaintenanceDialogProps {
    maintenance: MaintenanceListItem;
}

export function DeleteMaintenanceDialog({
    maintenance,
}: DeleteMaintenanceDialogProps) {
    const [open, setOpen] = useState(false);

    const deleteMaintenance = useDeleteMaintenance();

    const handleDelete = async () => {
        try {
            await deleteMaintenance.mutateAsync(
                maintenance.id
            );

            toast.add({
                title: "Maintenance Deleted.",
                description: "The maintenance record has been deleted successfully",
                type:"success",
            });

            setOpen(false)
        }catch (error) {
            let message = "Unable to delete the maintenance record. Please try again.";

            if (isAxiosError(error)) {
                const detail = error.response?.data?.detail;

                if (typeof detail === "string") {
                    message = detail;
                }
            }

            toast.add({
                title: "Failed to delete maintenance",
                description: message,
                type: "error",
            })
        }
    };

    const handleOpenChange = (value: boolean) => {
        if(!deleteMaintenance.isPending) {
            setOpen(value);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger 
                render={
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete Maintenance">
                        <Trash2 className="size-4"/>
                    </Button>
                }
            />

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Delete Maintenance Record?
                    </DialogTitle>

                    <DialogDescription>
                        Are you sure you want to delete{" "}
                        <span className="font-medium text-foreground">
                            {maintenance.description}
                        </span>
                        ? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={deleteMaintenance.isPending}
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        disabled={deleteMaintenance.isPending}
                        onClick={handleDelete}
                    >
                        {deleteMaintenance.isPending && (
                            <Loader2 className="animate-spin" />
                        )}

                        {deleteMaintenance.isPending
                            ? "Deleting..."
                            : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}