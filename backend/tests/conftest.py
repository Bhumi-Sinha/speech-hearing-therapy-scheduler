import pytest
from datetime import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.patient import Patient
from app.models.therapist import Therapist, TherapistAvailability
from app.models.room import Room
from app.models.appointment import Appointment  # noqa: F401 -- ensure mapped before create_all


@pytest.fixture()
def db_session():
    # In-memory SQLite is enough for exercising the scheduling logic in isolation
    # (no UUID/Enum server-side features are relied on in these tests).
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def sample_data(db_session):
    patient = Patient(full_name="Test Patient", condition_type="speech")
    therapist = Therapist(full_name="Dr. Test", specialization="speech_therapy")
    room = Room(name="Room A")
    db_session.add_all([patient, therapist, room])
    db_session.flush()

    # Therapist available Monday-Friday 09:00-17:00
    for weekday in range(0, 5):
        db_session.add(
            TherapistAvailability(
                therapist_id=therapist.id, weekday=weekday, start_time=time(9, 0), end_time=time(17, 0)
            )
        )
    db_session.commit()
    return {"patient": patient, "therapist": therapist, "room": room}
