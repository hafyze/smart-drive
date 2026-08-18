import { z } from "zod";

export const vehicleCreateSchema = z.object({
  nickname: z
    .string()
    .min(1, { error: "Nickname is required" })
    .max(50, { error: "Nickname must be 50 characters or less" }),

  manufacturer: z
    .string()
    .min(1, { error: "Manufacturer is required" })
    .max(50, { error: "Manufacturer must be 50 characters or less" }),

  model: z
    .string()
    .min(1, { error: "Model is required" })
    .max(50, { error: "Model must be 50 characters or less" }),

  variant: z
    .string()
    .min(1, { error: "Variant is required" })
    .max(100, { error: "Variant must be 100 characters or less" }),

  year: z.coerce
    .number()
    .int({ error: "Year must be a whole number" })
    .min(1950, { error: "Year must be 1950 or later" })
    .max(2100, { error: "Year must be 2100 or earlier" }),

  current_mileage: z.coerce
    .number()
    .int({ error: "Mileage must be a whole number" })
    .min(0, { error: "Mileage cannot be negative" }),

  fuel_type: z.enum([
    "PETROL",
    "DIESEL",
    "HYBRID",
    "PHEV",
    "EV",
  ]),

  transmission: z.enum([
    "MANUAL",
    "AUTOMATIC",
    "CVT",
    "DCT",
    "AMT",
    "EV_SINGLE_SPEED",
    "OTHER",
  ]),

  engine: z
    .string()
    .max(100, { error: "Engine must be 100 characters or less" })
    .optional()
    .or(z.literal("")),

  plate_number: z
    .string()
    .max(20, { error: "Plate number must be 20 characters or less" })
    .optional()
    .or(z.literal("")),

  purchase_date: z
    .string()
    .optional()
    .or(z.literal("")),

  vin: z
    .string()
    .max(30, { error: "VIN must be 30 characters or less" })
    .optional()
    .or(z.literal("")),

  color: z
    .string()
    .max(50, { error: "Color must be 50 characters or less" })
    .optional()
    .or(z.literal("")),

  photo_url: z
    .string()
    .optional()
    .or(z.literal("")),

  notes: z
    .string()
    .max(1000, { error: "Notes must be 1000 characters or less" })
    .optional()
    .or(z.literal("")),
});

export type VehicleCreateFormInput = z.input<
  typeof vehicleCreateSchema
>;

export type VehicleCreateFormValues = z.output<
  typeof vehicleCreateSchema
>;

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

export type VehicleUpdateFormInput = z.input<
    typeof vehicleUpdateSchema
>;

export type VehicleUpdateFormValues = z.output<
    typeof vehicleUpdateSchema
>;