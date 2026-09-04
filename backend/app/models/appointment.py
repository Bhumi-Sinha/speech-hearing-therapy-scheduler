import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.db_types import GUID as UUID


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)

    patient_id = Column(UUID(), ForeignKey("patients.id"), nullable=False)
    therapist_id = Column(UUID(), ForeignKey("therapists.id"), nullable=False)
    room_id = Column(UUID(), ForeignKey("rooms.id"), nullable=False)

    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)

    status = Column(
        Enum(AppointmentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AppointmentStatus.SCHEDULED,
    )
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="appointments")
    therapist = relationship("Therapist", back_populates="appointments")
    room = relationship("Room", back_populates="appointments")
