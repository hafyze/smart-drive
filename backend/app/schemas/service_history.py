from datetime import date
from pydantic import BaseModel

from app.schemas.maintenance import MaintenanceType


class ServiceHistoryItem(BaseModel):
    id: str
    type: MaintenanceType
    description: str | None = None
    cost: float | None = None


class ServiceHistoryVisit(BaseModel):
    vehicle_id: str
    service_date: date
    mileage: int
    workshop: str | None = None
    total_cost: float
    items: list[ServiceHistoryItem]