from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.maintenance import MaintenanceType


class PlanStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class ActionType(str, Enum):
    SCHEDULED_SERVICE = "SCHEDULED_SERVICE"
    PREVENTIVE_INSPECTION = "PREVENTIVE_INSPECTION"
    USER_CREATED = "USER_CREATED"
    RESEARCH_RECOMMENDATION = "RESEARCH_RECOMMENDATION"


class ActionSource(str, Enum):
    EXISTING_SCHEDULE = "EXISTING_SCHEDULE"
    PREDICTIVE_REPORT = "PREDICTIVE_REPORT"
    USER = "USER"


class ActionPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"


class ActionStatus(str, Enum):
    PROPOSED = "PROPOSED"
    PLANNED = "PLANNED"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class TriggerBasis(str, Enum):
    DATE = "DATE"
    MILEAGE = "MILEAGE"
    BOTH = "BOTH"
    UNKNOWN = "UNKNOWN"


class ReminderStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DISMISSED = "DISMISSED"


class ReminderSettings(BaseModel):
    enabled: bool = False
    advance_days: int | None = Field(default=None, ge=0, le=365)
    advance_km: int | None = Field(default=None, ge=0, le=100_000)
    status: ReminderStatus = ReminderStatus.ACTIVE
    history: list[dict] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def require_threshold(self):
        if self.enabled and self.advance_days is None and self.advance_km is None:
            raise ValueError("An enabled reminder needs a date or mileage threshold.")
        return self


class ActionSourceReference(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    url: str | None = Field(default=None, max_length=2048)
    excerpt: str | None = Field(default=None, max_length=500)


class ActionStatusEvent(BaseModel):
    status: ActionStatus
    changed_at: datetime
    reason: str | None = Field(default=None, max_length=500)


class MaintenancePlanAction(BaseModel):
    id: str
    user_id: str
    vehicle_id: str
    plan_id: str
    event_key: str = Field(max_length=250)
    maintenance_type: MaintenanceType | None = None
    category: str = Field(max_length=100)
    component: str = Field(max_length=120)
    title: str = Field(max_length=200)
    description: str | None = Field(default=None, max_length=1500)
    action_type: ActionType
    recommendation_source: ActionSource
    source_references: list[ActionSourceReference] = Field(default_factory=list, max_length=8)
    priority: ActionPriority = ActionPriority.NORMAL
    status: ActionStatus = ActionStatus.PROPOSED
    trigger_basis: TriggerBasis = TriggerBasis.UNKNOWN
    target_mileage: int | None = Field(default=None, ge=0)
    target_date: date | None = None
    target_date_estimated: bool = False
    source_due_mileage: int | None = Field(default=None, ge=0)
    source_due_date: date | None = None
    scheduled_date: date | None = None
    completion_date: date | None = None
    completion_mileage: int | None = Field(default=None, ge=0)
    work_performed: str | None = Field(default=None, max_length=1500)
    service_provider: str | None = Field(default=None, max_length=200)
    estimated_cost: float | None = Field(default=None, ge=0)
    actual_cost: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=1500)
    skip_reason: str | None = Field(default=None, max_length=500)
    component_replaced: bool = False
    service_visit_id: str | None = None
    status_history: list[ActionStatusEvent] = Field(default_factory=list, max_length=100)
    reminder: ReminderSettings = Field(default_factory=ReminderSettings)
    reminder_due: bool = False
    reminder_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class MaintenancePlan(BaseModel):
    id: str
    user_id: str
    vehicle_id: str
    name: str = Field(max_length=120)
    status: PlanStatus
    horizon_months: Literal[3, 6, 12]
    expected_monthly_mileage: int | None = Field(default=None, ge=1, le=20_000)
    version: int = Field(default=1, ge=1)
    actions: list[MaintenancePlanAction] = Field(default_factory=list, max_length=200)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GeneratePlanRequest(BaseModel):
    name: str = Field(default="Maintenance plan", min_length=1, max_length=120)
    horizon_months: Literal[3, 6, 12] = 6
    expected_monthly_mileage: int | None = Field(default=None, ge=1, le=20_000)


class CreateUserActionRequest(BaseModel):
    maintenance_type: MaintenanceType = MaintenanceType.OTHER
    category: str = Field(default="Other", min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1500)
    target_date: date | None = None
    target_mileage: int | None = Field(default=None, ge=0)
    priority: ActionPriority = ActionPriority.NORMAL
    notes: str | None = Field(default=None, max_length=1500)


class UpdateActionRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1500)
    target_date: date | None = None
    target_mileage: int | None = Field(default=None, ge=0)
    scheduled_date: date | None = None
    priority: ActionPriority | None = None
    notes: str | None = Field(default=None, max_length=1500)
    reminder: ReminderSettings | None = None


class ReviewActionRequest(BaseModel):
    accepted: bool
    reason: str | None = Field(default=None, max_length=500)


class ApprovePlanRequest(BaseModel):
    action_ids: list[str] | None = Field(default=None, max_length=200)


class RescheduleActionRequest(BaseModel):
    target_date: date | None = None
    target_mileage: int | None = Field(default=None, ge=0)
    scheduled_date: date | None = None
    reason: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def require_target(self):
        if self.target_date is None and self.target_mileage is None and self.scheduled_date is None:
            raise ValueError("A new due date, mileage, or scheduled date is required.")
        return self


class SkipActionRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class CompleteActionRequest(BaseModel):
    completion_date: date
    actual_mileage: int = Field(ge=0)
    work_performed: str = Field(min_length=1, max_length=500)
    service_provider: str | None = Field(default=None, max_length=200)
    actual_cost: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=1000)
    component_replaced: bool = False
    create_service_record: bool = False
    next_due_date: date | None = None
    next_due_mileage: int | None = Field(default=None, ge=0)


class ReminderUpdateRequest(BaseModel):
    enabled: bool
    advance_days: int | None = Field(default=None, ge=0, le=365)
    advance_km: int | None = Field(default=None, ge=0, le=100_000)

    @model_validator(mode="after")
    def require_threshold(self):
        if self.enabled and self.advance_days is None and self.advance_km is None:
            raise ValueError("An enabled reminder needs a date or mileage threshold.")
        return self
