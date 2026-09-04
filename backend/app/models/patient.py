import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum, Integer, Text
from app.db_types import GUID as UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ConditionType(str, enum.Enum):
    SPEECH = "speech"
    HEARING = "hearing"
    BOTH = "both"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(150), nullable=False)
    age = Column(Integer, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(150), nullable=True)
    condition_type = Column(Enum(ConditionType, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ConditionType.SPEECH)
    notes = Column(Text, nullable=True)
    is_active = Column(String(10), default="active")  # active / inactive / discharged
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    appointments = relationship(
        "Appointment", back_populates="patient", cascade="all, delete-orphan"
    )
