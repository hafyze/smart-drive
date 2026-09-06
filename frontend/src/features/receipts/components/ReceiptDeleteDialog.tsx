import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";

import { useDeleteReceipt } from "../hooks/useReceipts";
import type { Receipt } from "../types/receipt";
import { toast } from "@/shared/components/ui/toast";

interface ReceiptDeleteDialogProps {
    receipt: Receipt;
}

export function ReceiptDeleteDialog({
    receipt,
}: ReceiptDeleteDialogProps) {
    const deleteReceipt = useDeleteReceipt();

    const handleDelete = async () => {
        try {
            await deleteReceipt.mutateAsync(
                receipt.id,
            );

            toast.add({
                type: "success",
                description:"Receipt deleted"
            })
        } catch (error: any) {
            console.error(
                "DELETE RECEIPT ERROR:",
                error.response?.data ?? error,
            );
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger
                render={
                    <Button
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                    </Button>
                }
            />

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Delete receipt?
                    </AlertDialogTitle>

                    <AlertDialogDescription>
                        This will permanently delete{" "}
                        <span className="font-medium">
                            {receipt.original_filename}
                        </span>
                        . This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>
                        Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteReceipt.isPending}
                        className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
                    >
                        {deleteReceipt.isPending
                            ? "Deleting..."
                            : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}