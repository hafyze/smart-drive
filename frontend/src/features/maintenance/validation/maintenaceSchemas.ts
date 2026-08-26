import { z } from "zod";

export const maintenanceSchema = z.object({
    type: z.enum([
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
    ]),

    description: z.string()
                    .min(1, "Description is required.")
                    .max(500, "Description must be 500 characters or less"),

    service_date: z.string()
                    .min(1, "Service date is required."),

     mileage_at_service: z
        .number()
        .int("Mileage must be a whole number.")
        .min(0, "Mileage cannot be negative."),

    next_due_date: z
        .string()
        .optional()
        .or(z.literal("")),

    next_due_mileage: z
        .number()
        .int("Mileage must be a whole number.")
        .min(0, "Mileage cannot be negative.")
        .optional(),

    cost: z
        .number()
        .min(0, "Cost cannot be negative.")
        .optional(),

    workshop: z
        .string()
        .max(200, "Workshop name must be 200 characters or less.")
        .optional(),

    notes: z
        .string()
        .max(1000, "Notes must be 1000 characters or less.")
        .optional(),
});

export type MaintenaceFormValues = z.infer<typeof maintenanceSchema>