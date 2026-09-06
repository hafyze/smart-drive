import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
];

export const receiptUploadSchema = z.object({
    file: z
        .instanceof(File)
        .refine(
            (file) => file.size > 0,
            "Please select a file.",
        )
        .refine(
            (file) => file.size <= MAX_FILE_SIZE,
            "Receipt must be 10 MB or smaller.",
        )
        .refine(
            (file) =>
                ALLOWED_FILE_TYPES.includes(
                    file.type,
                ),
            "Only PDF, JPEG, PNG and WEBP files are allowed.",
        ),

    notes: z
        .string()
        .max(
            1000,
            "Notes must be 1000 characters or less.",
        )
        .optional(),
});

export type ReceiptUploadFormValues =
    z.infer<typeof receiptUploadSchema>;