from datetime import datetime, timedelta

import pytest

from app.crud.appointment import create_appointment
from app.services.scheduler import (
    ProposedAppointment,
    SchedulingError,
    find_available_slots,
    validate_and_prepare,
)


def next_monday_at(hour: int, minute: int = 0) -> datetime:
    """Helper: returns a datetime for the next Monday at the given time, so
    tests are deterministic regardless of when they're run (therapist fixture
    is available Mon-Fri 09:00-17:00)."""
    today = datetime.utcnow()
    days_ahead = (0 - today.weekday()) % 7
    days_ahead = days_ahead or 7  # always a *future* Monday, never today
    monday = (today + timedelta(days=days_ahead)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return monday


def test_valid_appointment_passes(db_session, sample_data):
    start = next_monday_at(10)
    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
    )
    # Should not raise
    validate_and_prepare(db_session, proposal)


def test_rejects_double_booking_same_therapist(db_session, sample_data):
    start = next_monday_at(10)
    create_appointment(
        db_session,
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
        notes=None,
    )

    # Overlapping slot, same therapist -> should be rejected
    overlapping_start = start + timedelta(minutes=15)
    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=overlapping_start,
        end_time=overlapping_start + timedelta(minutes=45),
    )
    with pytest.raises(SchedulingError) as exc:
        validate_and_prepare(db_session, proposal)
    assert exc.value.code == "therapist_conflict"


def test_allows_back_to_back_appointments(db_session, sample_data):
    """An appointment ending exactly when another starts should NOT conflict."""
    start = next_monday_at(10)
    create_appointment(
        db_session,
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
        notes=None,
    )
    next_start = start + timedelta(minutes=45)
    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=next_start,
        end_time=next_start + timedelta(minutes=45),
    )
    validate_and_prepare(db_session, proposal)  # should not raise


def test_rejects_outside_clinic_hours(db_session, sample_data):
    start = next_monday_at(19)  # 7 PM, clinic closes at 18:00
    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
    )
    with pytest.raises(SchedulingError) as exc:
        validate_and_prepare(db_session, proposal)
    assert exc.value.code == "outside_clinic_hours"


def test_rejects_outside_therapist_availability(db_session, sample_data):
    # Therapist only available 09:00-17:00, but clinic is open until 18:00 -
    # 17:15-18:00 is fully within clinic hours but outside this therapist's own schedule.
    start = next_monday_at(17, minute=15)
    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
    )
    with pytest.raises(SchedulingError) as exc:
        validate_and_prepare(db_session, proposal)
    assert exc.value.code == "therapist_unavailable_time"


def test_rejects_invalid_slot_boundary(db_session, sample_data):
    start = next_monday_at(10, minute=7)  # not on a 15-min boundary
    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
    )
    with pytest.raises(SchedulingError) as exc:
        validate_and_prepare(db_session, proposal)
    assert exc.value.code == "invalid_slot_boundary"


def test_rejects_too_short_session(db_session, sample_data):
    start = next_monday_at(10)
    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=5),
    )
    with pytest.raises(SchedulingError) as exc:
        validate_and_prepare(db_session, proposal)
    assert exc.value.code == "session_too_short"


def test_rejects_past_datetime(db_session, sample_data):
    start = (datetime.utcnow() - timedelta(days=1)).replace(minute=0, second=0, microsecond=0)
    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
    )
    with pytest.raises(SchedulingError) as exc:
        validate_and_prepare(db_session, proposal)
    assert exc.value.code == "past_datetime"


def test_rejects_patient_double_booked_with_different_therapist(db_session, sample_data):
    """Same patient can't be in two places at once, even with a different therapist/room."""
    from datetime import time as dtime

    from app.models.room import Room
    from app.models.therapist import Therapist, TherapistAvailability

    other_therapist = Therapist(full_name="Dr. Second", specialization="audiology")
    other_room = Room(name="Room B")
    db_session.add_all([other_therapist, other_room])
    db_session.flush()
    for weekday in range(5):
        db_session.add(
            TherapistAvailability(
                therapist_id=other_therapist.id,
                weekday=weekday,
                start_time=dtime(9, 0),
                end_time=dtime(17, 0),
            )
        )
    db_session.commit()

    start = next_monday_at(10)
    create_appointment(
        db_session,
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
        notes=None,
    )

    proposal = ProposedAppointment(
        patient_id=sample_data["patient"].id,
        therapist_id=other_therapist.id,
        room_id=other_room.id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
    )
    with pytest.raises(SchedulingError) as exc:
        validate_and_prepare(db_session, proposal)
    assert exc.value.code == "patient_conflict"


def test_find_available_slots_excludes_booked_time(db_session, sample_data):
    start = next_monday_at(10)
    create_appointment(
        db_session,
        patient_id=sample_data["patient"].id,
        therapist_id=sample_data["therapist"].id,
        room_id=sample_data["room"].id,
        start_time=start,
        end_time=start + timedelta(minutes=45),
        notes=None,
    )
    slots = find_available_slots(db_session, date=start, duration_minutes=45)
    booked = [
        s for s in slots if s["therapist_id"] == sample_data["therapist"].id and s["start_time"] == start
    ]
    assert booked == []  # that exact slot should not be offered as available
