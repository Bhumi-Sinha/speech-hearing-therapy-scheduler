from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user
from app.models.patient import Patient
from app.models.therapist import Therapist
from app.models.room import Room
from app.models.appointment import Appointment, AppointmentStatus

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
    today_end = today_start + timedelta(days=1)

    return {
        "total_patients": db.query(Patient).count(),
        "active_patients": db.query(Patient).filter(Patient.is_active == "active").count(),
        "total_therapists": db.query(Therapist).count(),
        "active_therapists": db.query(Therapist).filter(Therapist.is_active == True).count(),  # noqa: E712
        "total_rooms": db.query(Room).count(),
        "active_rooms": db.query(Room).filter(Room.is_active == True).count(),  # noqa: E712
        "appointments_today": db.query(Appointment).filter(
            Appointment.start_time >= today_start,
            Appointment.start_time < today_end,
            Appointment.status == AppointmentStatus.SCHEDULED,
        ).count(),
        "appointments_this_week": db.query(Appointment).filter(
            Appointment.start_time >= today_start,
            Appointment.start_time < today_start + timedelta(days=7),
            Appointment.status == AppointmentStatus.SCHEDULED,
        ).count(),
    }
