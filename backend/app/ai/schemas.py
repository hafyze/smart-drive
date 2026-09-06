from datetime import date
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