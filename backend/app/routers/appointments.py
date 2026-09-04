import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import appointment as crud
from app.database import get_db
from app.models.appointment import AppointmentStatus
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentUpdate,
    AvailableSlotOut,
)
from app.services.scheduler import (
    ProposedAppointment,
    SchedulingError,
    find_available_slots,
    validate_and_prepare,
)

router = APIRouter(
    prefix="/api/appointments", tags=["appointments"], dependencies=[Depends(get_current_user)]
)


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    proposal = ProposedAppointment(
        patient_id=data.patient_id,
        therapist_id=data.therapist_id,
        room_id=data.room_id,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    try:
        validate_and_prepare(db, proposal)
    except SchedulingError as e:
        raise HTTPException(status_code=409, detail={"code": e.code, "message": e.message}) from e

    appt = crud.create_appointment(
        db,
        patient_id=data.patient_id,
        therapist_id=data.therapist_id,
        room_id=data.room_id,
        start_time=data.start_time,
        end_time=data.end_time,
        notes=data.notes,
    )
    return crud.get_appointment(db, appt.id)


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    therapist_id: uuid.UUID | None = None,
    room_id: uuid.UUID | None = None,
    patient_id: uuid.UUID | None = None,
    status: AppointmentStatus | None = None,
    db: Session = Depends(get_db),
):
    return crud.list_appointments(
        db,
        date_from=date_from,
        date_to=date_to,
        therapist_id=therapist_id,
        room_id=room_id,
        patient_id=patient_id,
        status=status,
    )


@router.get("/available-slots", response_model=list[AvailableSlotOut])
def available_slots(
    date: datetime = Query(..., description="Date to search, e.g. 2026-08-20"),
    duration_minutes: int = Query(default=45, ge=15, le=180),
    therapist_id: uuid.UUID | None = None,
    room_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    return find_available_slots(
        db, date=date, duration_minutes=duration_minutes, therapist_id=therapist_id, room_id=room_id
    )


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: uuid.UUID, db: Session = Depends(get_db)):
    appt = crud.get_appointment(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(appointment_id: uuid.UUID, data: AppointmentUpdate, db: Session = Depends(get_db)):
    appt = crud.get_appointment(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # If any scheduling-relevant field changes, re-validate the whole proposal.
    reschedule_fields = {"patient_id", "therapist_id", "room_id", "start_time", "end_time"}
    changed = data.model_dump(exclude_unset=True)
    if reschedule_fields & changed.keys():
        proposal = ProposedAppointment(
            patient_id=changed.get("patient_id", appt.patient_id),
            therapist_id=changed.get("therapist_id", appt.therapist_id),
            room_id=changed.get("room_id", appt.room_id),
            start_time=changed.get("start_time", appt.start_time),
            end_time=changed.get("end_time", appt.end_time),
            exclude_appointment_id=appt.id,
        )
        try:
            validate_and_prepare(db, proposal)
        except SchedulingError as e:
            raise HTTPException(status_code=409, detail={"code": e.code, "message": e.message}) from e

    for field, value in changed.items():
        setattr(appt, field, value)

    crud.save_appointment(db, appt)
    return crud.get_appointment(db, appt.id)


@router.delete("/{appointment_id}", status_code=204)
def delete_appointment(appointment_id: uuid.UUID, db: Session = Depends(get_db)):
    appt = crud.get_appointment(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    crud.delete_appointment(db, appt)
