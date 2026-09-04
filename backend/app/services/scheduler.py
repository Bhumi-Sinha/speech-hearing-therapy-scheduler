"""
Scheduling engine.

All the business rules for booking an appointment live here, kept separate
from the HTTP layer (routers) so they can be unit-tested directly and reused
(e.g. by a future "auto-schedule" feature) without touching FastAPI.

Rules enforced:
  1. end_time must be after start_time (already validated at the schema level).
  2. Session length must be within [MIN_SESSION_MINUTES, MAX_SESSION_MINUTES].
  3. Appointment must start on a SLOT_GRANULARITY_MINUTES boundary (e.g. :00, :15, :30, :45).
  4. Appointment must fall within clinic operating hours (CLINIC_OPEN_HOUR..CLINIC_CLOSE_HOUR).
  5. Cannot book in the past.
  6. Therapist must be active and, if they have defined availability slots,
     the appointment must fall fully inside one of their weekly working windows.
  7. No double-booking: the same therapist, room, or patient cannot have two
     overlapping SCHEDULED appointments (cancelled/no-show appointments don't block).
"""

from dataclasses import dataclass
from datetime import datetime, time, timedelta
from uuid import UUID

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.models.appointment import Appointment, AppointmentStatus
from app.models.patient import Patient
from app.models.room import Room
from app.models.therapist import Therapist, TherapistAvailability


class SchedulingError(Exception):
    """Raised whenever a proposed appointment violates a scheduling rule."""

    def __init__(self, message: str, code: str = "scheduling_error"):
        self.message = message
        self.code = code
        super().__init__(message)


@dataclass
class ProposedAppointment:
    patient_id: UUID
    therapist_id: UUID
    room_id: UUID
    start_time: datetime
    end_time: datetime
    exclude_appointment_id: UUID | None = None  # set when rescheduling an existing one


def _overlaps_filter(start: datetime, end: datetime):
    """Two intervals [a,b) and [c,d) overlap iff a < d and c < b."""
    return and_(Appointment.start_time < end, Appointment.end_time > start)


def validate_basic_rules(proposal: ProposedAppointment) -> None:
    duration = proposal.end_time - proposal.start_time
    duration_minutes = duration.total_seconds() / 60

    if duration_minutes < settings.MIN_SESSION_MINUTES:
        raise SchedulingError(
            f"Session too short: minimum is {settings.MIN_SESSION_MINUTES} minutes.",
            code="session_too_short",
        )
    if duration_minutes > settings.MAX_SESSION_MINUTES:
        raise SchedulingError(
            f"Session too long: maximum is {settings.MAX_SESSION_MINUTES} minutes.",
            code="session_too_long",
        )

    if proposal.start_time.minute % settings.SLOT_GRANULARITY_MINUTES != 0 or proposal.start_time.second != 0:
        raise SchedulingError(
            f"Appointments must start on a {settings.SLOT_GRANULARITY_MINUTES}-minute boundary.",
            code="invalid_slot_boundary",
        )

    if proposal.start_time < datetime.utcnow() - timedelta(minutes=1):
        raise SchedulingError("Cannot schedule an appointment in the past.", code="past_datetime")

    open_time = time(settings.CLINIC_OPEN_HOUR, 0)
    close_time = time(settings.CLINIC_CLOSE_HOUR, 0)
    if proposal.start_time.time() < open_time or proposal.end_time.time() > close_time:
        raise SchedulingError(
            f"Appointments must be within clinic hours "
            f"({settings.CLINIC_OPEN_HOUR}:00–{settings.CLINIC_CLOSE_HOUR}:00).",
            code="outside_clinic_hours",
        )
    if proposal.end_time.date() != proposal.start_time.date():
        raise SchedulingError("Appointments cannot span across midnight/multiple days.", code="spans_days")


def validate_entities_exist_and_active(
    db: Session, proposal: ProposedAppointment
) -> tuple[Patient, Therapist, Room]:
    patient = db.query(Patient).filter(Patient.id == proposal.patient_id).first()
    if not patient:
        raise SchedulingError("Patient not found.", code="patient_not_found")

    therapist = db.query(Therapist).filter(Therapist.id == proposal.therapist_id).first()
    if not therapist:
        raise SchedulingError("Therapist not found.", code="therapist_not_found")
    if not therapist.is_active:
        raise SchedulingError("Therapist is not active.", code="therapist_inactive")

    room = db.query(Room).filter(Room.id == proposal.room_id).first()
    if not room:
        raise SchedulingError("Room not found.", code="room_not_found")
    if not room.is_active:
        raise SchedulingError("Room is not active.", code="room_inactive")

    return patient, therapist, room


def validate_therapist_availability(db: Session, proposal: ProposedAppointment, therapist: Therapist) -> None:
    """If the therapist has defined weekly availability, the appointment must
    fit fully inside one of those windows. If no availability rows exist for
    that therapist at all, we don't block (means "not configured yet")."""
    slots: list[TherapistAvailability] = (
        db.query(TherapistAvailability).filter(TherapistAvailability.therapist_id == therapist.id).all()
    )
    if not slots:
        return  # no availability configured -> fall back to clinic-wide hours only

    weekday = proposal.start_time.weekday()
    todays_slots = [s for s in slots if s.weekday == weekday]
    if not todays_slots:
        raise SchedulingError(
            f"{therapist.full_name} does not work on that day of the week.",
            code="therapist_unavailable_day",
        )

    start_t = proposal.start_time.time()
    end_t = proposal.end_time.time()
    fits = any(start_t >= s.start_time and end_t <= s.end_time for s in todays_slots)
    if not fits:
        raise SchedulingError(
            f"{therapist.full_name} is not available at that time.",
            code="therapist_unavailable_time",
        )


def check_conflicts(db: Session, proposal: ProposedAppointment) -> None:
    """No overlapping SCHEDULED appointment for the same therapist, room, or patient."""
    query = db.query(Appointment).filter(
        Appointment.status == AppointmentStatus.SCHEDULED,
        _overlaps_filter(proposal.start_time, proposal.end_time),
        or_(
            Appointment.therapist_id == proposal.therapist_id,
            Appointment.room_id == proposal.room_id,
            Appointment.patient_id == proposal.patient_id,
        ),
    )
    if proposal.exclude_appointment_id:
        query = query.filter(Appointment.id != proposal.exclude_appointment_id)

    conflict = query.first()
    if conflict:
        if conflict.therapist_id == proposal.therapist_id:
            raise SchedulingError(
                "Therapist already has an appointment at that time.", code="therapist_conflict"
            )
        if conflict.room_id == proposal.room_id:
            raise SchedulingError("Room is already booked at that time.", code="room_conflict")
        raise SchedulingError("Patient already has an appointment at that time.", code="patient_conflict")


def validate_and_prepare(db: Session, proposal: ProposedAppointment) -> tuple[Patient, Therapist, Room]:
    """Run every rule. Raises SchedulingError on the first violation found."""
    validate_basic_rules(proposal)
    patient, therapist, room = validate_entities_exist_and_active(db, proposal)
    validate_therapist_availability(db, proposal, therapist)
    check_conflicts(db, proposal)
    return patient, therapist, room


def find_available_slots(
    db: Session,
    date: datetime,
    duration_minutes: int,
    therapist_id: UUID | None = None,
    room_id: UUID | None = None,
) -> list[dict]:
    """
    Scans clinic hours on the given date in SLOT_GRANULARITY_MINUTES increments
    and returns every (therapist, room) combination that is free for the
    requested duration. Used by the "find a slot" screen in the frontend so
    the admin doesn't have to guess-and-check.
    """
    therapists = db.query(Therapist).filter(Therapist.is_active)
    if therapist_id:
        therapists = therapists.filter(Therapist.id == therapist_id)
    therapists = therapists.all()

    rooms = db.query(Room).filter(Room.is_active)
    if room_id:
        rooms = rooms.filter(Room.id == room_id)
    rooms = rooms.all()

    day_start = datetime.combine(date.date(), time(settings.CLINIC_OPEN_HOUR, 0))
    day_end = datetime.combine(date.date(), time(settings.CLINIC_CLOSE_HOUR, 0))
    step = timedelta(minutes=settings.SLOT_GRANULARITY_MINUTES)
    duration = timedelta(minutes=duration_minutes)

    # Preload the day's scheduled appointments once, instead of querying per slot.
    existing = (
        db.query(Appointment)
        .filter(
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.start_time >= day_start,
            Appointment.start_time < day_end,
        )
        .all()
    )

    results = []
    cursor = day_start
    while cursor + duration <= day_end:
        slot_end = cursor + duration
        for therapist in therapists:
            avail = (
                db.query(TherapistAvailability)
                .filter(
                    TherapistAvailability.therapist_id == therapist.id,
                    TherapistAvailability.weekday == cursor.weekday(),
                )
                .all()
            )
            if avail:
                fits_availability = any(
                    cursor.time() >= a.start_time and slot_end.time() <= a.end_time for a in avail
                )
                if not fits_availability:
                    continue

            therapist_busy = any(
                a.therapist_id == therapist.id and a.start_time < slot_end and a.end_time > cursor
                for a in existing
            )
            if therapist_busy:
                continue

            for room in rooms:
                room_busy = any(
                    a.room_id == room.id and a.start_time < slot_end and a.end_time > cursor for a in existing
                )
                if room_busy:
                    continue

                results.append(
                    {
                        "start_time": cursor,
                        "end_time": slot_end,
                        "therapist_id": therapist.id,
                        "therapist_name": therapist.full_name,
                        "room_id": room.id,
                        "room_name": room.name,
                    }
                )
        cursor += step

    return results
