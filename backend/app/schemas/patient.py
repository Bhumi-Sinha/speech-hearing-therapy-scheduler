import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.patient import ConditionType


class PatientBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    age: int | None = Field(default=None, ge=0, le=120)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    condition_type: ConditionType = ConditionType.SPEECH
    notes: str | None = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: str | None = None
    age: int | None = None
    phone: str | None = None
    email: str | None = None
    condition_type: ConditionType | None = None
    notes: str | None = None
    is_active: str | None = None


class PatientOut(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: str
    created_at: datetime
