from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


# Enums

class MaintenanceType(str, Enum):
    ENGINE_OIL = "ENGINE_OIL"
    OIL_FILTER = "OIL_FILTER"
    AIR_FILTER = "AIR_FILTER"
    CABIN_FILTER = "CABIN_FILTER"
    BRAKE_SERVICE = "BRAKE_SERVICE"
    BRAKE_FLUID = "BRAKE_FLUID"
    COOLANT = "COOLANT"
    TRANSMISSION = "TRANSMISSION"
    BATTERY = "BATTERY"
    TYRE = "TYRE"
    ALIGNMENT = "ALIGNMENT"
    SPARK_PLUG = "SPARK_PLUG"
    TIMING_BELT = "TIMING_BELT"
    INSPECTION = "INSPECTION"
    OTHER = "OTHER"


class MaintenanceStatus(str, Enum):
    COMPLETED = "COMPLETED"

class MaintenanceScheduleStatus(str, Enum):
    UPCOMING = "UPCOMING"
    OVERDUE = "OVERDUE"


# Base Maintenance

class MaintenanceBase(BaseModel):
    type: MaintenanceType

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    service_date: date

    mileage_at_service: int = Field(
        ...,
        ge=0,
    )

    next_due_date: date | None = None

    next_due_mileage: int | None = Field(
        default=None,
        ge=0,
    )

    cost: float | None = Field(
        default=None,
        ge=0,
    )

    workshop: str | None = Field(
        default=None,
        max_length=200,
    )

    notes: str | None = Field(
        default=None,
        max_length=1000,
    )


# Create

class MaintenanceCreate(MaintenanceBase):
    vehicle_id: str


# Update

class MaintenanceUpdate(BaseModel):
    type: MaintenanceType | None = None

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    service_date: date | None = None

    mileage_at_service: int | None = Field(
        default=None,
        ge=0,
    )

    next_due_date: date | None = None

    next_due_mileage: int | None = Field(
        default=None,
        ge=0,
    )

    cost: float | None = Field(
        default=None,
        ge=0,
    )

    workshop: str | None = Field(
        default=None,
        max_length=200,
    )

    notes: str | None = Field(
        default=None,
        max_length=1000,
    )


# Response

class MaintenanceResponse(MaintenanceBase):
    id: str
    user_id: str
    vehicle_id: str
    status: MaintenanceStatus
    schedule_status: MaintenanceScheduleStatus | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# List

class MaintenanceListItem(BaseModel):
    id: str
    vehicle_id: str
    type: MaintenanceType
    description: str | None = None
    service_date: date
    mileage_at_service: int
    next_due_date: date | None = None
    next_due_mileage: int | None = None
    cost: float | None = None
    workshop: str | None = None
    notes: str | None = None
    status: MaintenanceStatus
    schedule_status: MaintenanceScheduleStatus | None = None

    model_config = ConfigDict(from_attributes=True)