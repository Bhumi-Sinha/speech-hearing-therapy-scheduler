import uuid
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.therapist import Specialization


class AvailabilitySlotBase(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0=Monday ... 6=Sunday")
    start_time: time
    end_time: time

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v


class AvailabilitySlotCreate(AvailabilitySlotBase):
    pass


class AvailabilitySlotOut(AvailabilitySlotBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class TherapistBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    email: str | None = None
    phone: str | None = None
    specialization: Specialization = Specialization.SPEECH_THERAPY


class TherapistCreate(TherapistBase):
    availability_slots: list[AvailabilitySlotCreate] = []


class TherapistUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    specialization: Specialization | None = None
    is_active: bool | None = None


class TherapistOut(TherapistBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    availability_slots: list[AvailabilitySlotOut] = []
