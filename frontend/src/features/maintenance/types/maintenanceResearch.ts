export type MaintenanceRecommendationType = "SCHEDULED" | "PREVENTIVE" | "INSPECTION";
export type MaintenanceKnowledgeConfidence = "HIGH" | "MEDIUM" | "LOW";
export type MaintenanceSourceType = "MANUFACTURER" | "OEM" | "TECHNICAL_DATABASE" | "SPECIALIST";
export type VehicleIdentityConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface MaintenanceSource {
    name: string;
    url: string;
    title: string | null;
    source_type: MaintenanceSourceType;
}

export interface MaintenanceGuidanceItem {
    key: string;
    name: string;
    recommendation_type: MaintenanceRecommendationType;
    interval_km: number | null;
    interval_months: number | null;
    starting_mileage: number | null;
    description: string | null;
    reason: string | null;
    confidence: MaintenanceKnowledgeConfidence;
    sources: MaintenanceSource[];
}

export interface MaintenanceKnowledgeProfile {
    manufacturer: string;
    model: string;
    variant: string | null;
    year: number;
    transmission: string;
    vehicle_match_confidence: VehicleIdentityConfidence;
    guidance: MaintenanceGuidanceItem[];
    generated_at: string;
}
