import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import type { Receipt } from "../types/receipt";
import { receiptApi } from "../api/receiptApi";

interface ReceiptPreviewDialogProps {
    receipt: Receipt;
}

export function ReceiptPreviewDialog({ receipt, }: ReceiptPreviewDialogProps) {
    const [open, setOpen] = useState(false);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const isImage = receipt.content_type.startsWith("image/");

    const isPdf = receipt.content_type === "application/pdf";

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();
        let objectUrl: string | null = null;
        setIsLoading(true);
        setHasError(false);

        receiptApi.getFile(receipt.id, controller.signal)
            .then((file) => {
                objectUrl = URL.createObjectURL(file);
                setFileUrl(objectUrl);
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setHasError(true);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });

        return () => {
            controller.abort();
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            setFileUrl(null);
        };
    }, [open, receipt.id]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="sm">
                        View
                    </Button>
                }
            />
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>
                        {receipt.original_filename}
                    </DialogTitle>

                    <DialogDescription>
                        Receipt attached to this service visit.
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-hidden rounded-lg border bg-muted/20">
                    {isLoading && (
                        <p className="p-6 text-center text-sm text-muted-foreground">
                            Loading receipt…
                        </p>
                    )}

                    {hasError && (
                        <p className="p-6 text-center text-sm text-destructive">
                            Unable to load this receipt. Please try again.
                        </p>
                    )}

                    {fileUrl && isImage && (
                        <div className="flex max-h-[70vh] items-center justify-center overflow-auto p-4">
                            <img
                                src={fileUrl}
                                alt={receipt.original_filename}
                                className="max-h-[65vh] max-w-full object-contain"
                            />
                        </div>
                    )}

                    {fileUrl && isPdf && (
                        <iframe
                            src={fileUrl}
                            title={receipt.original_filename}
                            className="h-[70vh] w-full"
                        />
                    )}

                    {!isImage && !isPdf && (
                        <div className="flex min-h-60 flex-col items-center justify-center gap-3 p-6 text-center">
                            <FileText className="size-10 text-muted-foreground" />

                            <p className="text-sm text-muted-foreground">
                                Preview is not available for this file type.
                            </p>
                        </div>
                    )}
                </div>

                {receipt.notes && (
                    <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">
                            {receipt.notes}
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
