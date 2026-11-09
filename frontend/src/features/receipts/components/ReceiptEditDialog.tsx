import { useState } from "react";
import { Pencil } from "lucide-react";
import { getApiErrorMessage } from "@/shared/utils/api-error";
import { toast } from "@/shared/components/ui/toastManager";

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
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

import { useUpdateReceipt } from "../hooks/useReceipts";
import type { Receipt } from "../types/receipt";

interface ReceiptEditDialogProps {
    receipt: Receipt;
}

export function ReceiptEditDialog({
    receipt,
}: ReceiptEditDialogProps) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState(
        receipt.notes ?? "",
    );

    const updateReceipt = useUpdateReceipt();

    const handleSubmit = async () => {
        try {
            await updateReceipt.mutateAsync({
                receiptId: receipt.id,
                payload: {
                    notes: notes.trim() || null,
                },
            });

            setOpen(false);
        } catch (error: unknown) {
            toast.add({
                type: "error",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) setNotes(receipt.notes ?? "");
        setOpen(nextOpen);
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
                        size="sm"
                    >
                        <Pencil className="mr-2 size-4" />
                        Edit
                    </Button>
                }
            />

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Edit Receipt
                    </DialogTitle>

                    <DialogDescription>
                        Update information associated with this receipt.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor={`receipt-edit-${receipt.id}`}>
                        Notes
                    </Label>

                    <Textarea
                        id={`receipt-edit-${receipt.id}`}
                        value={notes}
                        onChange={(event) =>
                            setNotes(event.target.value)
                        }
                        placeholder="Optional notes"
                        maxLength={1000}
                    />

                    {updateReceipt.isError && (
                        <p className="text-sm text-destructive">
                            Failed to update receipt.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={updateReceipt.isPending}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        disabled={updateReceipt.isPending}
                    >
                        {updateReceipt.isPending
                            ? "Saving..."
                            : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
