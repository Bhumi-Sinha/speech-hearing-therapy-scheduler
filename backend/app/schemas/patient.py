import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.patient import ConditionType


class PatientBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    age: Optional[int] = Field(default=None, ge=0, le=120)
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=150)
    condition_type: ConditionType = ConditionType.SPEECH
    notes: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    condition_type: Optional[ConditionType] = None
    notes: Optional[str] = None
    is_active: Optional[str] = None


class PatientOut(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: str
    created_at: datetime
