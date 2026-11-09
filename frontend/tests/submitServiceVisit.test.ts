import assert from "node:assert/strict";
import test from "node:test";

import { saveServiceVisitWithReceipt } from "../src/features/maintenance/utils/submitServiceVisit.ts";

test("a failed receipt attachment retries against the saved visit without duplicating it", async () => {
    let createCount = 0;
    const attachedTo: string[] = [];
    let failAttachment = true;
    let savedId: string | null = null;

    const createVisit = async () => {
        createCount += 1;
        return { id: "visit-123" };
    };
    const attachReceipt = async (serviceVisitId: string) => {
        attachedTo.push(serviceVisitId);
        if (failAttachment) throw new Error("temporary upload error");
    };

    const first = await saveServiceVisitWithReceipt({
        existingVisitId: null,
        createVisit,
        onVisitCreated: (id) => { savedId = id; },
        attachReceipt,
    });

    assert.deepEqual(first, { serviceVisitId: "visit-123", receiptAttachmentFailed: true });
    assert.equal(savedId, "visit-123");

    failAttachment = false;
    const retry = await saveServiceVisitWithReceipt({
        existingVisitId: savedId,
        createVisit,
        onVisitCreated: () => assert.fail("Retry must not create another visit"),
        attachReceipt,
    });

    assert.deepEqual(retry, { serviceVisitId: "visit-123", receiptAttachmentFailed: false });
    assert.equal(createCount, 1);
    assert.deepEqual(attachedTo, ["visit-123", "visit-123"]);
});

test("a visit save failure does not attempt to upload the receipt", async () => {
    let receiptUploadCount = 0;

    await assert.rejects(
        saveServiceVisitWithReceipt({
            existingVisitId: null,
            createVisit: async () => { throw new Error("visit save failed"); },
            onVisitCreated: () => assert.fail("No visit was created"),
            attachReceipt: async () => { receiptUploadCount += 1; },
        }),
        /visit save failed/,
    );

    assert.equal(receiptUploadCount, 0);
});
