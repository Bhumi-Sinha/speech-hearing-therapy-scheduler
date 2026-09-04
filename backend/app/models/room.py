import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean
from app.db_types import GUID as UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)  # e.g. "Therapy Room 1"
    equipment = Column(String(255), nullable=True)  # e.g. "Audiometer, Sound booth"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    appointments = relationship("Appointment", back_populates="room")
