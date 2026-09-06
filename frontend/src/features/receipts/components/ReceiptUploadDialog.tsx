import { useState } from "react";
import { Paperclip, Upload } from "lucide-react";

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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

import { useCreateReceipt } from "../hooks/useReceipts";

interface ReceiptUploadDialogProps {
    vehicleId: string;
    serviceVisitId: string;
}

export function ReceiptUploadDialog({
    vehicleId,
    serviceVisitId,
}: ReceiptUploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState("");

    const createReceipt = useCreateReceipt();

    const handleSubmit = async () => {
        if (!file) {
            return;
        }

        await createReceipt.mutateAsync({
            vehicleId,
            serviceVisitId,
            file,
            notes: notes.trim() || undefined,
        });

        setFile(null);
        setNotes("");
        setOpen(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
        >
            <DialogTrigger 
                render={
                    <Button variant="outline" size="sm">
                        <Paperclip className="mr-2 size-4"/>
                        Upload Receipt
                    </Button>
                } 
            />

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Upload Receipt
                    </DialogTitle>

                    <DialogDescription>
                        Attach a receipt or invoice to this service visit.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor={`receipt-${serviceVisitId}`}>
                            Receipt file
                        </Label>

                        <Input
                            id={`receipt-${serviceVisitId}`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(event) => {
                                const selectedFile =
                                    event.target.files?.[0] ?? null;

                                setFile(selectedFile);
                            }}
                        />

                        <p className="text-xs text-muted-foreground">
                            PDF, JPEG, PNG or WEBP. Maximum 10 MB.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`receipt-notes-${serviceVisitId}`}>
                            Notes
                        </Label>

                        <Textarea
                            id={`receipt-notes-${serviceVisitId}`}
                            value={notes}
                            onChange={(event) =>
                                setNotes(event.target.value)
                            }
                            placeholder="Optional notes about this receipt"
                            maxLength={1000}
                        />
                    </div>

                    {createReceipt.isError && (
                        <p className="text-sm text-destructive">
                            Failed to upload receipt.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={createReceipt.isPending}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        disabled={
                            !file ||
                            createReceipt.isPending
                        }
                    >
                        <Upload className="mr-2 size-4" />

                        {createReceipt.isPending
                            ? "Uploading..."
                            : "Upload"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}