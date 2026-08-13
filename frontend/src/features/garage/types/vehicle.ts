export type FuelType =
    | "PETROL"
    | "DIESEL"
    | "HYBRID"
    | "PHEV"
    | "EV";

export type TransmissionType =
    | "MANUAL"
    | "AUTOMATIC"
    | "CVT"
    | "DCT"
    | "AMT"
    | "EV_SINGLE_SPEED"
    | "OTHER";

export type VehicleStatus =
    | "ACTIVE"
    | "SOLD"
    | "SCRAPPED"
    | "ARCHIVED";

/**
 * Fields required when creating a vehicle.
 * Mirrors the backend VehicleCreate / VehicleBase schema.
 */
export interface VehicleCreate {
    nickname: string;
    manufacturer: string;
    model: string;
    variant: string;
    year: number;
    current_mileage: number;
    fuel_type: FuelType;
    transmission: TransmissionType;
    engine?: string | null;
    plate_number?: string | null;
    purchase_date?: string | null;
    vin?: string | null;
    color?: string | null;
    photo_url?: string | null;
    notes?: string | null;
}

/**
 * Fields accepted when updating a vehicle.
 * Mirrors the backend VehicleUpdate schema.
 */
export interface VehicleUpdate {
    nickname?: string | null;
    manufacturer?: string | null;
    model?: string | null;
    variant?: string | null;
    year?: number | null;
    current_mileage?: number | null;
    fuel_type?: FuelType | null;
    transmission?: TransmissionType | null;
    engine?: string | null;
    plate_number?: string | null;
    purchase_date?: string | null;
    vin?: string | null;
    color?: string | null;
    photo_url?: string | null;
    notes?: string | null;
}

/**
 * Lightweight vehicle representation used by the Garage list.
 * Mirrors VehicleListItem.
 */
export interface VehicleListItem {
    id: string;
    nickname: string;
    manufacturer: string;
    model: string;
    variant: string;
    year: number;
    current_mileage: number;
    status: VehicleStatus;
    photo_url: string | null;
}

/**
 * Full vehicle representation.
 * Mirrors VehicleResponse.
 */
export interface VehicleResponse {
    id: string;
    user_id: string;
    nickname: string;
    manufacturer: string;
    model: string;
    variant: string;
    year: number;
    current_mileage: number;
    fuel_type: FuelType;
    transmission: TransmissionType;
    engine: string | null;
    plate_number: string | null;
    purchase_date: string | null;
    vin: string | null;
    color: string | null;
    photo_url: string | null;
    notes: string | null;
    status: VehicleStatus;
    created_at: string;
    updated_at: string;
}

export interface DeleteVehicleResponse {
    success: boolean;
}