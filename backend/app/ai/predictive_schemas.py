from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.ai.schemas import MaintenanceSourceType, ResearchSource, VehicleIdentity


class PredictiveRiskCategory(str, Enum):
    MONITOR = "MONITOR"
    INSPECT = "INSPECT"
    HIGH_PRIORITY = "HIGH_PRIORITY"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class PredictiveAssessmentBasis(str, Enum):
    SCHEDULED_MAINTENANCE = "SCHEDULED_MAINTENANCE"
    DOCUMENTED_TECHNICAL_CONCERN = "DOCUMENTED_TECHNICAL_CONCERN"
    GENERAL_PREVENTIVE = "GENERAL_PREVENTIVE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class PredictiveEvidenceConfidence(str, Enum):
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    NONE = "NONE"


class PredictiveSourceQuality(str, Enum):
    MANUFACTURER = "MANUFACTURER"
    SPECIALIST = "SPECIALIST"


class PredictiveMaintenanceRecord(BaseModel):
    reference: str = Field(max_length=100)
    service_date: date
    mileage_at_service: int | None = None
    type: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=500)
    next_due_date: date | None = None
    next_due_mileage: int | None = None


class PredictiveCandidate(BaseModel):
    key: str = Field(pattern=r"^[a-z0-9_]{2,60}$")
    component_category: str = Field(max_length=100)
    component: str = Field(max_length=120)
    related_maintenance_types: list[str] = Field(default_factory=list, max_length=10)
    selection_reason: str = Field(max_length=500)
    selection_basis: str = Field(max_length=40)
    vehicle_context: str = Field(max_length=500)
    schedule_status: str = Field(max_length=20)
    maintenance_history: list[PredictiveMaintenanceRecord] = Field(default_factory=list, max_length=5)
    data_gaps: list[str] = Field(default_factory=list, max_length=6)
    evidence_needed: list[str] = Field(default_factory=list, max_length=5)


class PredictiveCandidateAnalysisDraft(BaseModel):
    candidate_key: str = Field(pattern=r"^[a-z0-9_]{2,60}$")
    source_urls: list[str] = Field(default_factory=list, max_length=8)
    evidence_quotes: list["PredictiveEvidenceQuote"] = Field(default_factory=list, max_length=5)


class PredictiveEvidenceQuote(BaseModel):
    source_url: str = Field(max_length=2048)
    quote: str = Field(min_length=20, max_length=500)


class PredictiveResearchDraft(BaseModel):
    analyses: list[PredictiveCandidateAnalysisDraft] = Field(default_factory=list, max_length=3)
    sources: list[ResearchSource] = Field(default_factory=list, max_length=10)


class PredictiveSourceReference(BaseModel):
    name: str = Field(max_length=150)
    title: str = Field(max_length=300)
    url: str = Field(max_length=2048)
    domain: str = Field(max_length=255)
    source_type: MaintenanceSourceType
    quality: PredictiveSourceQuality
    publication_date: str | None = Field(default=None, max_length=40)
    retrieved_at: datetime


class PredictiveKnowledgeEntry(BaseModel):
    entry_id: str = Field(max_length=64)
    schema_version: int = 1
    knowledge_revision: int = 1
    vehicle_applicability: dict
    component_category: str
    component: str
    description: str | None = None
    supported_symptoms: list[str] = Field(default_factory=list, max_length=8)
    documented_concern: str | None = None
    recommendation: str | None = None
    mileage_applicability: dict | None = None
    age_applicability: dict | None = None
    evidence_summary: str
    matched_excerpts: list[PredictiveEvidenceQuote] = Field(default_factory=list, max_length=5)
    sources: list[PredictiveSourceReference] = Field(default_factory=list, max_length=8)
    confidence: PredictiveEvidenceConfidence
    evidence_retrieved_at: datetime
    review_status: str = "UNREVIEWED_AUTOMATED_RESEARCH"
    active: bool = True


class PredictiveRecommendation(BaseModel):
    candidate_key: str
    component_category: str
    component: str
    risk_category: PredictiveRiskCategory
    assessment_basis: PredictiveAssessmentBasis
    why_selected: str
    vehicle_context: str
    schedule_status: str
    recorded_maintenance: list[PredictiveMaintenanceRecord] = Field(default_factory=list)
    data_gaps: list[str] = Field(default_factory=list)
    documented_concern: str | None = None
    evidence_summary: str | None = None
    matched_excerpts: list[PredictiveEvidenceQuote] = Field(default_factory=list, max_length=5)
    recommendation: str
    confidence: PredictiveEvidenceConfidence
    sources: list[PredictiveSourceReference] = Field(default_factory=list)
    knowledge_entry: PredictiveKnowledgeEntry | None = None
    last_researched_at: datetime


class PredictiveMaintenanceOverview(BaseModel):
    high_priority_count: int = 0
    inspect_count: int = 0
    monitor_count: int = 0
    insufficient_data_count: int = 0
    last_researched_at: datetime


class PredictiveMaintenanceReport(BaseModel):
    vehicle_id: str
    vehicle: VehicleIdentity
    vehicle_age_years: int
    current_mileage_km: int
    knowledge_model_version: str
    research_schema_version: int
    knowledge_revision: int
    generated_at: datetime
    overview: PredictiveMaintenanceOverview
    recommendations: list[PredictiveRecommendation] = Field(default_factory=list, max_length=3)


class PredictiveMaintenanceRequest(BaseModel):
    refresh: bool = False
