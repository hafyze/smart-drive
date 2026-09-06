import { FileText, ImageIcon } from "lucide-react";

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

interface ReceiptPreviewDialogProps {
    receipt: Receipt;
}

export function ReceiptPreviewDialog({ receipt, }: ReceiptPreviewDialogProps) {
    const fileUrl = `http://127.0.0.1:8000${receipt.file_url}`
    const isImage = receipt.content_type.startsWith("image/");

    const isPdf = receipt.content_type === "application/pdf";

    return (
        <Dialog>
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
                    {isImage && (
                        <div className="flex max-h-[70vh] items-center justify-center overflow-auto p-4">
                            <img
                                src={fileUrl}
                                alt={receipt.original_filename}
                                className="max-h-[65vh] max-w-full object-contain"
                            />
                        </div>
                    )}

                    {isPdf && (
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