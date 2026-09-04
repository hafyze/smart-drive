import { z } from "zod";

const maintenanceTypes = [
    "ENGINE_OIL",
    "OIL_FILTER",
    "AIR_FILTER",
    "CABIN_FILTER",
    "BRAKE_SERVICE",
    "BRAKE_FLUID",
    "COOLANT",
    "TRANSMISSION",
    "BATTERY",
    "TYRE",
    "ALIGNMENT",
    "SPARK_PLUG",
    "TIMING_BELT",
    "INSPECTION",
    "OTHER",
] as const;


// ============================================================
// Maintenance Item Schema
// ============================================================

export const maintenanceItemSchema = z.object({
    type: z.enum(maintenanceTypes),

    description: z
        .string()
        .max(
            500,
            "Description must be 500 characters or less.",
        ),

    next_due_date: z
        .string()
        .optional(),

    next_due_mileage: z
        .number()
        .int("Mileage must be a whole number.")
        .min(
            0,
            "Mileage cannot be negative.",
        )
        .optional(),

    cost: z
        .number()
        .min(
            0,
            "Cost cannot be negative.",
        )
        .optional(),

    notes: z
        .string()
        .max(
            1000,
            "Notes must be 1000 characters or less.",
        ),
});


// ============================================================
// Service Visit Schema
// ============================================================

export const serviceVisitSchema = z.object({
    service_date: z
        .string()
        .min(
            1,
            "Service date is required.",
        ),

    mileage_at_service: z
        .number()
        .int(
            "Mileage must be a whole number.",
        )
        .min(
            0,
            "Mileage cannot be negative.",
        ),

    workshop: z
        .string()
        .max(
            200,
            "Workshop name must be 200 characters or less.",
        )
        .optional(),

    notes: z
        .string()
        .max(
            1000,
            "Notes must be 1000 characters or less.",
        )
        .optional(),

    items: z
        .array(maintenanceItemSchema)
        .min(
            1,
            "At least one maintenance item is required.",
        ),
});


// ============================================================
// Types
// ============================================================

export type MaintenanceItemFormValues =
    z.infer<typeof maintenanceItemSchema>;

export type ServiceVisitFormValues =
    z.infer<typeof serviceVisitSchema>;