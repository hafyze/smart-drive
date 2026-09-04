from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# Enums
# ============================================================

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


# ============================================================
# Maintenance Item
# ============================================================

class MaintenanceItemBase(BaseModel):
    type: MaintenanceType

    description: str | None = Field(
        default=None,
        max_length=500,
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

    notes: str | None = Field(
        default=None,
        max_length=1000,
    )


class MaintenanceItemCreate(MaintenanceItemBase):
    pass


class MaintenanceItemResponse(MaintenanceItemBase):
    id: str
    status: MaintenanceStatus
    schedule_status: MaintenanceScheduleStatus | None = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Service Visit
# ============================================================

class ServiceVisitBase(BaseModel):
    service_date: date

    mileage_at_service: int = Field(
        ...,
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


class ServiceVisitCreate(ServiceVisitBase):
    vehicle_id: str

    items: list[MaintenanceItemCreate] = Field(
        ...,
        min_length=1,
    )

class ServiceVisitUpdate(BaseModel):
    service_date: date | None = None

    mileage_at_service: int | None = Field(
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

    items: list[MaintenanceItemCreate] | None = Field(
        default=None,
        min_length=1,
    )

class ServiceVisitResponse(ServiceVisitBase):
    id: str
    user_id: str
    vehicle_id: str

    items: list[MaintenanceItemResponse]

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)