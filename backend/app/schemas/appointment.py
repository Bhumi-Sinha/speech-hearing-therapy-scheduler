import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.appointment import AppointmentStatus


class AppointmentBase(BaseModel):
    patient_id: uuid.UUID
    therapist_id: uuid.UUID
    room_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    notes: str | None = None

    @model_validator(mode="after")
    def check_time_order(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    """Used for rescheduling: change time/room/therapist, or update status."""

    patient_id: uuid.UUID | None = None
    therapist_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: AppointmentStatus | None = None
    notes: str | None = None


class NameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str


class RoomNameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    therapist_id: uuid.UUID
    room_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    notes: str | None = None
    created_at: datetime

    patient: NameOut
    therapist: NameOut
    room: RoomNameOut


class AvailableSlotOut(BaseModel):
    """A free slot returned by the 'find available slots' endpoint."""

    start_time: datetime
    end_time: datetime
    therapist_id: uuid.UUID
    therapist_name: str
    room_id: uuid.UUID
    room_name: str
