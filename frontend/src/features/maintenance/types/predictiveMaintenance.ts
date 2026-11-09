export type PredictiveRiskCategory = "MONITOR" | "INSPECT" | "HIGH_PRIORITY" | "INSUFFICIENT_DATA";
export type PredictiveEvidenceConfidence = "HIGH" | "MODERATE" | "LOW" | "NONE";

export interface PredictiveMaintenanceRecord {
    reference: string;
    service_date: string;
    mileage_at_service: number | null;
    type: string;
    description: string | null;
    next_due_date: string | null;
    next_due_mileage: number | null;
}

export interface PredictiveSourceReference {
    name: string;
    title: string;
    url: string;
    domain: string;
    source_type: string;
    quality: "MANUFACTURER" | "SPECIALIST";
    publication_date: string | null;
    retrieved_at: string;
}

export interface PredictiveEvidenceQuote {
    source_url: string;
    quote: string;
}

export interface PredictiveRecommendation {
    candidate_key: string;
    component_category: string;
    component: string;
    risk_category: PredictiveRiskCategory;
    assessment_basis: string;
    why_selected: string;
    vehicle_context: string;
    schedule_status: string;
    recorded_maintenance: PredictiveMaintenanceRecord[];
    data_gaps: string[];
    documented_concern: string | null;
    evidence_summary: string | null;
    matched_excerpts: PredictiveEvidenceQuote[];
    recommendation: string;
    confidence: PredictiveEvidenceConfidence;
    sources: PredictiveSourceReference[];
    last_researched_at: string;
}

export interface PredictiveMaintenanceReport {
    vehicle_id: string;
    vehicle: { manufacturer: string; model: string; variant: string | null; year: number | null; transmission: string | null; engine: string | null; generation: string | null };
    vehicle_age_years: number;
    current_mileage_km: number;
    knowledge_model_version: string;
    research_schema_version: number;
    knowledge_revision: number;
    generated_at: string;
    overview: { high_priority_count: number; inspect_count: number; monitor_count: number; insufficient_data_count: number; last_researched_at: string };
    recommendations: PredictiveRecommendation[];
}
