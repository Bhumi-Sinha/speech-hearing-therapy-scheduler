"""
Concurrency / race-condition test for the double-booking guard.

The existing unit and integration tests prove the *sequential* logic is
correct: call the conflict check once, and a genuine conflict is caught.
They do NOT prove the system is safe when two booking requests for the
same therapist + room + time arrive at (almost) the same moment - which
is exactly what happens at a busy front desk, or with a flaky client that
retries a POST.

`services/scheduler.check_conflicts` runs a SELECT for overlapping
appointments, and `crud/appointment.create_appointment` INSERTs the new
row as a separate step. There is no `SELECT ... FOR UPDATE`, Postgres
advisory lock, or DB-level UNIQUE/EXCLUDE constraint tying the two
together, so two transactions can both pass the SELECT before either
commits its INSERT - a classic check-then-act (TOCTOU) race.

This only shows up under real transactional isolation, so it's run
against Postgres (matching the CI service / local docker-compose `db`
container), not the in-memory SQLite used by the other tests. It skips
automatically if no Postgres is reachable, so it never breaks `pytest`
for a contributor without Docker running.

Run explicitly with Docker's Postgres up:
    docker compose up -d db
    POSTGRES_HOST=localhost POSTGRES_PORT=5433 pytest tests/test_concurrency.py -v
"""

import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, time, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_DB", "scheduler_db_test")

from app.config import settings  # noqa: E402
from app.database import Base  # noqa: E402
from app.models.appointment import Appointment, AppointmentStatus  # noqa: E402
from app.models.patient import Patient  # noqa: E402
from app.models.room import Room  # noqa: E402
from app.models.therapist import Therapist, TherapistAvailability  # noqa: E402
from app.services import scheduler as scheduler_service  # noqa: E402


def _postgres_reachable() -> bool:
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect():
            return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _postgres_reachable(),
    reason="Postgres not reachable at settings.DATABASE_URL - see module docstring",
)


@pytest.fixture()
def pg_session_factory():
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    yield factory
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_concurrent_bookings_for_identical_slot_do_not_double_book(pg_session_factory):
    # --- Arrange: one patient, one therapist (open all week), one room ---
    setup_db = pg_session_factory()
    patient = Patient(full_name="Race Condition Patient", condition_type="speech")
    therapist = Therapist(full_name="Dr. Race", specialization="speech_therapy")
    room = Room(name=f"Race Room {uuid.uuid4().hex[:8]}")
    setup_db.add_all([patient, therapist, room])
    setup_db.flush()
    for weekday in range(7):
        setup_db.add(
            TherapistAvailability(
                therapist_id=therapist.id, weekday=weekday, start_time=time(0, 0), end_time=time(23, 59)
            )
        )
    setup_db.commit()
    patient_id, therapist_id, room_id = patient.id, therapist.id, room.id
    setup_db.close()

    start = (datetime.utcnow() + timedelta(days=1)).replace(minute=0, second=0, microsecond=0)
    end = start + timedelta(minutes=30)

    def attempt_booking(_):
        db = pg_session_factory()
        try:
            proposal = scheduler_service.ProposedAppointment(
                patient_id=patient_id,
                therapist_id=therapist_id,
                room_id=room_id,
                start_time=start,
                end_time=end,
            )
            scheduler_service.validate_basic_rules(proposal)
            scheduler_service.check_conflicts(db, proposal)  # <-- the racy check
            db.add(
                Appointment(
                    patient_id=patient_id,
                    therapist_id=therapist_id,
                    room_id=room_id,
                    start_time=start,
                    end_time=end,
                    status=AppointmentStatus.SCHEDULED,
                )
            )
            db.commit()
            return "booked"
        except Exception:
            db.rollback()
            return "rejected"
        finally:
            db.close()

    # --- Act: fire 10 identical booking requests at (almost) the same instant ---
    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(attempt_booking, range(10)))

    # --- Assert: exactly one should have won ---
    booked = results.count("booked")
    assert booked == 1, (
        f"Expected exactly 1 of 10 concurrent identical booking requests to "
        f"succeed, but {booked} succeeded. The check-then-insert guard in "
        f"services/scheduler.check_conflicts() has a race condition: wrap the "
        f"check + insert in one transaction using SELECT ... FOR UPDATE on the "
        f"therapist/room's existing rows, or add a Postgres EXCLUDE constraint "
        f"on (therapist_id, tsrange(start_time, end_time)) so the database "
        f"itself makes overlap impossible."
    )
