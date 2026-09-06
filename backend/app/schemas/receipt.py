from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

class ReceiptBase(BaseModel):
    notes: str | None = Field(
        default=None,
        max_length=1000
    )

class ReceiptCreate(ReceiptBase):
    vehicle_id:         str
    service_visit_id:   str | None=None

class ReceiptUpdate(BaseModel):
    notes: str | None = Field(
        default=None,
        max_length=1000
    )
    service_visit_id: str | None = None

class ReceiptResponse(ReceiptBase):
    id:                 str
    user_id:            str
    vehicle_id:         str

    service_visit_id:   str | None = None

    original_filename:  str
    stored_filename:    str

    file_url:           str

    content_type:       str
    file_size:          int

    created_at:         datetime
    updated_at:         datetime

    model_config =      ConfigDict(from_attributes=True)