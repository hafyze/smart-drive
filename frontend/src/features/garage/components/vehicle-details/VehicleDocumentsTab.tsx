import { FileText, Image, Paperclip } from "lucide-react";

import { useReceipts } from "@/features/receipts/hooks/useReceipts";
import { ReceiptDeleteDialog } from "@/features/receipts/components/ReceiptDeleteDialog";
import { ReceiptEditDialog } from "@/features/receipts/components/ReceiptEditDialog";
import { ReceiptPreviewDialog } from "@/features/receipts/components/ReceiptPreviewDialog";
import { ReceiptUploadDialog } from "@/features/receipts/components/ReceiptUploadDialog";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

export function VehicleDocumentsTab({ vehicleId }: { vehicleId: string }) {
    const { data: receipts, isLoading, isError } = useReceipts(vehicleId);

    return (
        <div className="space-y-5">
            <Card className="border-white/10 bg-[#121518] text-white">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div><h2 className="font-heading text-xl font-semibold">Vehicle Documents</h2><p className="text-sm text-white/55">Service receipts and invoices saved for this vehicle</p></div>
                    <ReceiptUploadDialog vehicleId={vehicleId} />
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-xs text-white/55">
                        SmartDrive currently stores service receipts and invoices. Insurance, road tax, and registration document management are not available yet.
                    </p>

                    {isLoading && <div className="h-16 animate-pulse rounded-xl bg-white/5" />}
                    {isError && <p role="alert" className="rounded-xl border border-red-400/20 p-4 text-sm text-red-200">Unable to load this vehicle’s receipts.</p>}
                    {!isLoading && !isError && receipts?.length === 0 && (
                        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center">
                            <Paperclip className="mx-auto mb-3 size-7 text-white/40" />
                            <h3 className="font-medium">No receipts uploaded</h3>
                            <p className="mt-1 text-sm text-white/50">Upload a receipt or invoice to keep it with this vehicle.</p>
                        </div>
                    )}
                    {receipts?.map((receipt) => {
                        const Icon = receipt.content_type.startsWith("image/") ? Image : FileText;
                        return (
                            <article key={receipt.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[.07]"><Icon className="size-5 text-red-300" /></span>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-medium">{receipt.original_filename}</h3>
                                        <p className="mt-1 text-xs text-white/50">Uploaded {new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(new Date(receipt.created_at))} · {(receipt.file_size / 1024).toFixed(0)} KB{receipt.service_visit_id ? " · Linked to a service visit" : " · Not linked to a visit"}</p>
                                        {receipt.notes && <p className="mt-1 truncate text-xs text-white/60">{receipt.notes}</p>}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center justify-end gap-1">
                                    <ReceiptPreviewDialog receipt={receipt} />
                                    <ReceiptEditDialog receipt={receipt} />
                                    <ReceiptDeleteDialog receipt={receipt} />
                                </div>
                            </article>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
