from datetime import date, datetime
from enum import Enum
from uuid import UUID
from pydantic import BaseModel, Field, model_validator

class VehicleIdentityConfidence(str, Enum):
    HIGH =   "HIGH"
    MEDIUM = "MEDIUM"
    LOW =    "LOW"

class VehicleIdentity(BaseModel):
    manufacturer: str
    model: str
    variant: str | None = None
    year: int | None = None
    transmission: str | None = None
    engine: str | None = None
    generation: str | None = None

    confidence: VehicleIdentityConfidence

class VehicleContext(BaseModel):
    id: str
    manufacturer: str
    model: str
    variant: str | None = None
    year: int

    current_mileage: int
    engine: str | None = None

    fuel_type: str
    transmission: str

    identity: VehicleIdentity

class MaintenanceItemSummary(BaseModel):
    type: str

    last_done_date: date | None = None
    last_done_mileage: int | None = None

    next_due_date: date | None = None
    next_due_mileage: int | None = None

    mileage_since_last_done: int | None = None

    times_recorded: int = 0

    total_recorded_cost: float = 0

class MaintenanceSummary(BaseModel):
    total_service_visits: int = 0
    total_maintenance_items: int = 0

    total_recorded_cost: float = 0

    first_service_date: date | None = None
    last_service_date: date | None = None

    first_service_mileage: int | None = None
    last_service_mileage: int | None = None

    mileage_since_last_service: int | None = None
    history_coverage_km: int | None = None

    maintenance_items: list[MaintenanceItemSummary] = []

class VehicleMaintenanceContext(BaseModel):
    vehicle: VehicleContext

    maintenance: MaintenanceSummary

class MaintenanceRecommendationType(str, Enum):
    SCHEDULED = "SCHEDULED"
    PREVENTIVE = "PREVENTIVE"
    INSPECTION = "INSPECTION"


class KnowledgeConfidence(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class MaintenanceSourceType(str, Enum):
    MANUFACTURER = "MANUFACTURER"
    OEM = "OEM"
    TECHNICAL_DATABASE = "TECHNICAL_DATABASE"
    SPECIALIST = "SPECIALIST"


class MaintenanceSource(BaseModel):
    name: str
    url: str

    source_type: MaintenanceSourceType

    title: str | None = None


class MaintenanceGuidanceItem(BaseModel):
    key: str
    name: str

    recommendation_type: MaintenanceRecommendationType

    interval_km: int | None = None
    interval_months: int | None = None

    starting_mileage: int | None = None

    description: str | None = None
    reason: str | None = None

    confidence: KnowledgeConfidence

    sources: list[MaintenanceSource] = []


class MaintenanceKnowledgeProfile(BaseModel):
    manufacturer: str
    model: str
    variant: str | None = None
    year: int
    transmission: str

    vehicle_match_confidence: VehicleIdentityConfidence

    guidance: list[MaintenanceGuidanceItem]

    generated_at: datetime

class ResearchedVehicleMatch(BaseModel):
    manufacturer: str
    model: str

    variant: str | None = None

    year_from: int | None = None
    year_to: int | None = None

    transmission: str | None = None
    engine: str | None = None
    generation: str | None = None


class ResearchSource(BaseModel):
    name: str
    url: str
    title: str | None = None
    publication_date: str | None = None

    source_type: MaintenanceSourceType

    vehicle_match: ResearchedVehicleMatch | None = None


class ResearchedMaintenanceItem(BaseModel):
    key: str
    name: str

    recommendation_type: MaintenanceRecommendationType

    interval_km: int | None = None
    interval_months: int | None = None
    starting_mileage: int | None = None

    description: str | None = None
    reason: str | None = None

    source_urls: list[str]


class MaintenanceResearchResult(BaseModel):
    guidance: list[ResearchedMaintenanceItem]

    sources: list[ResearchSource]


class ConversationMaintenanceRecord(BaseModel):
    reference: str = Field(max_length=100)
    service_date: date
    mileage_at_service: int | None = None
    type: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=500)
    next_due_date: date | None = None
    next_due_mileage: int | None = None


class VehicleConversationContext(BaseModel):
    vehicle: VehicleContext
    maintenance_summary: MaintenanceSummary
    maintenance_records: list[ConversationMaintenanceRecord] = []
    history_truncated: bool = False


class ChatResearchClaim(BaseModel):
    claim: str = Field(min_length=1, max_length=1_200)
    source_urls: list[str] = Field(default_factory=list, max_length=8)


class ChatAnswerDraft(BaseModel):
    record_references: list[str] = Field(default_factory=list, max_length=100)
    researched_claims: list[ChatResearchClaim] = Field(default_factory=list, max_length=8)
    sources: list[ResearchSource] = Field(default_factory=list, max_length=10)
    interpretation: str | None = Field(default=None, max_length=2_000)
    limitations: list[str] = Field(default_factory=list, max_length=5)


class ChatRouteDraft(BaseModel):
    needs_research: bool
    search_queries: list[str] = Field(default_factory=list, max_length=3)
    direct_answer: ChatAnswerDraft | None = None

    @model_validator(mode="after")
    def validate_route(self):
        if self.needs_research and not self.search_queries:
            raise ValueError("Research routes require at least one query.")
        if not self.needs_research and self.direct_answer is None:
            raise ValueError("Record-only routes require a direct answer.")
        return self


class ConversationSource(BaseModel):
    url: str
    title: str
    name: str
    source_type: MaintenanceSourceType


class ConversationAnswer(BaseModel):
    recorded_information: list[ConversationMaintenanceRecord] = Field(default_factory=list, max_length=100)
    researched_claims: list[ChatResearchClaim] = Field(default_factory=list, max_length=8)
    sources: list[ConversationSource] = Field(default_factory=list, max_length=10)
    interpretation: str | None = Field(default=None, max_length=2_000)
    limitations: list[str] = Field(default_factory=list, max_length=5)


class ConversationTurn(BaseModel):
    id: str
    client_message_id: str
    question: str
    answer: ConversationAnswer | None = None
    status: str = "complete"
    created_at: datetime


class ConversationSummary(BaseModel):
    id: str
    vehicle_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    turn_count: int


class ConversationDetail(ConversationSummary):
    turns: list[ConversationTurn] = []


class ConversationMessageRequest(BaseModel):
    client_message_id: UUID
    content: str = Field(min_length=1, max_length=1_500)

    @model_validator(mode="after")
    def validate_content(self):
        if not self.content.strip():
            raise ValueError("Message cannot be blank.")
        return self
