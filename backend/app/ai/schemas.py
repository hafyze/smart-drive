from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel

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

    confidence: VehicleIdentityConfidence

class VehicleContext(BaseModel):
    id: str
    manufacturer: str
    model: str
    variant: str | None = None
    year: int

    current_mileage: int

    fuel_type: str
    transmission: str

    identity: VehicleIdentity

class MaintenanceItemSummary(BaseModel):
    type: str

    last_done_date: date | None = None
    last_done_mileage: int | None = None

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


class ResearchSource(BaseModel):
    name: str
    url: str
    title: str | None = None

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