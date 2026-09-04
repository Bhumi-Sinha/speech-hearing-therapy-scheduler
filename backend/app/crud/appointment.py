import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment, AppointmentStatus


def create_appointment(
    db: Session,
    patient_id: uuid.UUID,
    therapist_id: uuid.UUID,
    room_id: uuid.UUID,
    start_time: datetime,
    end_time: datetime,
    notes: Optional[str],
) -> Appointment:
    appt = Appointment(
        patient_id=patient_id,
        therapist_id=therapist_id,
        room_id=room_id,
        start_time=start_time,
        end_time=end_time,
        notes=notes,
        status=AppointmentStatus.SCHEDULED,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def get_appointment(db: Session, appointment_id: uuid.UUID) -> Appointment | None:
    return (
        db.query(Appointment)
        .options(joinedload(Appointment.patient), joinedload(Appointment.therapist), joinedload(Appointment.room))
        .filter(Appointment.id == appointment_id)
        .first()
    )


def list_appointments(
    db: Session,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    therapist_id: Optional[uuid.UUID] = None,
    room_id: Optional[uuid.UUID] = None,
    patient_id: Optional[uuid.UUID] = None,
    status: Optional[AppointmentStatus] = None,
) -> list[Appointment]:
    query = db.query(Appointment).options(
        joinedload(Appointment.patient), joinedload(Appointment.therapist), joinedload(Appointment.room)
    )
    if date_from:
        query = query.filter(Appointment.start_time >= date_from)
    if date_to:
        query = query.filter(Appointment.start_time < date_to)
    if therapist_id:
        query = query.filter(Appointment.therapist_id == therapist_id)
    if room_id:
        query = query.filter(Appointment.room_id == room_id)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if status:
        query = query.filter(Appointment.status == status)
    return query.order_by(Appointment.start_time).all()


def save_appointment(db: Session, appt: Appointment) -> Appointment:
    db.commit()
    db.refresh(appt)
    return appt


def delete_appointment(db: Session, appt: Appointment) -> None:
    db.delete(appt)
    db.commit()
