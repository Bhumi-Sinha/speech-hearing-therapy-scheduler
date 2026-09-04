import enum
import uuid
from datetime import datetime, time

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Time,
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.db_types import GUID as UUID


class Specialization(str, enum.Enum):
    SPEECH_THERAPY = "speech_therapy"
    AUDIOLOGY = "audiology"
    BOTH = "both"


class Therapist(Base):
    __tablename__ = "therapists"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=True)
    phone = Column(String(20), nullable=True)
    specialization = Column(
        Enum(Specialization, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=Specialization.SPEECH_THERAPY,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    appointments = relationship("Appointment", back_populates="therapist")
    availability_slots = relationship(
        "TherapistAvailability", back_populates="therapist", cascade="all, delete-orphan"
    )


class TherapistAvailability(Base):
    """
    Recurring weekly working hours for a therapist, e.g.
    Monday 09:00-13:00. Used by the scheduler to know when a therapist
    CAN be booked, before checking for conflicts with existing appointments.
    weekday: 0=Monday ... 6=Sunday (Python's date.weekday() convention)
    """

    __tablename__ = "therapist_availability"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    therapist_id = Column(UUID(), ForeignKey("therapists.id"), nullable=False)
    weekday = Column(Integer, nullable=False)  # 0-6
    start_time = Column(Time, nullable=False, default=time(9, 0))
    end_time = Column(Time, nullable=False, default=time(18, 0))

    therapist = relationship("Therapist", back_populates="availability_slots")
