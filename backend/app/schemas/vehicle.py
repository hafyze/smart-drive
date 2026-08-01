from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

#Enums

class FuelType(str, Enum):
    PETROL = "PETROL"
    DIESEL = "DIESEL"
    HYBRID = "HYBRID"
    PHEV = "PHEV"
    EV = "EV"

class TransmissionType(str, Enum):
    MANUAL = "MANUAL"
    AUTOMATIC = "AUTOMATIC"
    CVT = "CVT"
    DCT = "DCT"
    AMT = "AMT"
    EV_SINGLE_SPEED = "EV_SINGLE_SPEED"
    OTHER = "OTHER"

class VehicleStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SOLD = "SOLD"
    SCRAPPED = "SCRAPPED"
    ARCHIVED = "ARCHIVED"

#Base Vehicle
class VehicleBase(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=50)
    manufacturer: str = Field(..., min_length=1, max_length=50)
    model: str = Field(..., min_length=1, max_length=50)
    variant: str = Field(..., min_length=1, max_length=100)
    year: int = Field(..., ge=1950, le=2100)
    current_mileage: int = Field(..., ge=0)
    fuel_type: FuelType
    transmission: TransmissionType
    engine: str | None = Field(default=None, max_length=100)
    plate_number: str | None = Field(default=None, max_length=20)
    purchase_date: date | None = None
    vin: str | None = Field(default=None, max_length=30)
    color: str | None = Field(default=None, max_length=50)
    photo_url: str | None = None
    notes: str | None = Field(default=None, max_length=1000)

#Create
class VehicleCreate(VehicleBase):
    pass

#Update
class VehicleUpdate(BaseModel):
    nickname: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    variant: str | None = None
    year: int | None = Field(default=None, ge=1950, le=2100)
    current_mileage: int | None = Field(default=None, ge=0)
    fuel_type: FuelType | None = None
    transmission: TransmissionType | None = None
    engine: str | None = None
    plate_number: str | None = None
    purchase_date: date | None = None
    vin: str | None = None
    color: str | None = None
    photo_url: str | None = None
    notes: str | None = None

class VehicleResponse(VehicleBase):
    id: str
    user_id: str
    status: VehicleStatus
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

#List
class VehicleListItem(BaseModel):
    id: str
    nickname: str
    manufacturer: str
    model: str
    variant: str
    year: int
    current_mileage: int
    status: VehicleStatus
    photo_url: str | None = None
    model_config = ConfigDict(from_attributes=True)