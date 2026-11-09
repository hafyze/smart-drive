export interface SaveServiceVisitResult {
    serviceVisitId: string;
    receiptAttachmentFailed: boolean;
}

/** Save a visit once, then allow a failed receipt attachment to be retried against that visit. */
export async function saveServiceVisitWithReceipt({
    existingVisitId,
    createVisit,
    onVisitCreated,
    attachReceipt,
}: {
    existingVisitId: string | null;
    createVisit: () => Promise<{ id: string }>;
    onVisitCreated: (id: string) => void;
    attachReceipt?: (serviceVisitId: string) => Promise<unknown>;
}): Promise<SaveServiceVisitResult> {
    let serviceVisitId = existingVisitId;
    if (!serviceVisitId) {
        const created = await createVisit();
        serviceVisitId = created.id;
        onVisitCreated(serviceVisitId);
    }

    if (attachReceipt) {
        try {
            await attachReceipt(serviceVisitId);
        } catch {
            return { serviceVisitId, receiptAttachmentFailed: true };
        }
    }

    return { serviceVisitId, receiptAttachmentFailed: false };
}
