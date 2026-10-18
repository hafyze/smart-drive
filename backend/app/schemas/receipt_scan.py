from datetime import date

from pydantic import BaseModel, Field

from app.schemas.maintenance import MaintenanceType


class ReceiptScanItem(BaseModel):
    type: MaintenanceType = MaintenanceType.OTHER
    description: str = Field(max_length=500)
    cost: float | None = Field(default=None, ge=0)


class ReceiptScanResponse(BaseModel):
    service_date: date | None = None
    mileage_at_service: int | None = Field(default=None, ge=0)
    workshop: str | None = Field(default=None, max_length=200)
    items: list[ReceiptScanItem] = Field(default_factory=list)
    review_message: str = "Check all extracted values before saving."
