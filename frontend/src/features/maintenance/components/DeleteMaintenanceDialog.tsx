import { useState } from "react";
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
import type { ServiceVisit } from "../types/maintenance";

interface DeleteMaintenanceDialogProps {
    serviceVisit: ServiceVisit;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
    }).format(new Date(value));
}

export function DeleteMaintenanceDialog({
    serviceVisit,
}: DeleteMaintenanceDialogProps) {
    const [open, setOpen] = useState(false);

    const deleteMaintenance = useDeleteMaintenance();

    const handleDelete = async () => {
        try {
            await deleteMaintenance.mutateAsync(
                serviceVisit.id,
            );

            toast.add({
                title: "Service visit deleted",
                description:
                    "The maintenance service visit has been deleted successfully.",
                type: "success",
            });

            setOpen(false);
        } catch (error) {
            let message =
                "Unable to delete the service visit. Please try again.";

            if (isAxiosError(error)) {
                const detail =
                    error.response?.data?.detail;

                if (typeof detail === "string") {
                    message = detail;
                }
            }

            toast.add({
                title: "Failed to delete service visit",
                description: message,
                type: "error",
            });
        }
    };

    const handleOpenChange = (value: boolean) => {
        if (!deleteMaintenance.isPending) {
            setOpen(value);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label="Delete service visit"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                }
            />

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Delete Service Visit?
                    </DialogTitle>

                    <DialogDescription>
                        Are you sure you want to delete the{" "}
                        <span className="font-medium text-foreground">
                            {formatDate(serviceVisit.service_date)}
                        </span>{" "}
                        service visit with{" "}
                        <span className="font-medium text-foreground">
                            {serviceVisit.items.length}
                        </span>{" "}
                        {serviceVisit.items.length === 1
                            ? "item"
                            : "items"}
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
    );
}
