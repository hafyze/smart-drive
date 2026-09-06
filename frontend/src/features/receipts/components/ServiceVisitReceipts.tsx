import { FileText, Image, Paperclip } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { useReceipts } from "../hooks/useReceipts";
import { ReceiptUploadDialog } from "./ReceiptUploadDialog";
import { ReceiptPreviewDialog } from "./ReceiptPreviewDialog";

interface ServiceVisitReceiptsProps {
    vehicleId: string;
    serviceVisitId: string;
}

export function ServiceVisitReceipts({
    vehicleId,
    serviceVisitId,
}: ServiceVisitReceiptsProps) {
    const {
        data: receipts,
        isLoading,
        isError,
    } = useReceipts(
        vehicleId,
        serviceVisitId,
    );

    if (isLoading) {
        return (
            <div className="mt-4">
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="mt-4">
                <ReceiptUploadDialog
                    vehicleId={vehicleId}
                    serviceVisitId={serviceVisitId}
                />

                <p className="mt-2 text-xs text-destructive">
                    Unable to load receipts.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-4 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="size-4 text-muted-foreground" />

                    <span className="font-medium">
                        {receipts?.length ?? 0}{" "}
                        {(receipts?.length ?? 0) === 1
                            ? "receipt"
                            : "receipts"}
                    </span>
                </div>

                <ReceiptUploadDialog
                    vehicleId={vehicleId}
                    serviceVisitId={serviceVisitId}
                />
            </div>

            {receipts && receipts.length > 0 && (
                <div className="mt-3 space-y-2">
                    {receipts.map((receipt) => {
                        const isImage =
                            receipt.content_type.startsWith(
                                "image/",
                            );

                        const FileIcon =
                            isImage
                                ? Image
                                : FileText;

                        return (
                            <div
                                key={receipt.id}
                                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <FileIcon className="size-4 shrink-0 text-muted-foreground" />

                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {receipt.original_filename}
                                        </p>

                                        {receipt.notes && (
                                            <p className="truncate text-xs text-muted-foreground">
                                                {receipt.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* <Button
                                    variant="ghost"
                                    size="sm"
                                    render={
                                        <a
                                            href={`http://127.0.0.1:8000${receipt.file_url}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            View
                                        </a>
                                    }
                                /> */}

                                <ReceiptPreviewDialog receipt={receipt} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}