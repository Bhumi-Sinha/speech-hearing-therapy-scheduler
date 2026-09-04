import uuid

from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate


def create_patient(db: Session, data: PatientCreate) -> Patient:
    patient = Patient(**data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def get_patient(db: Session, patient_id: uuid.UUID) -> Patient | None:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def list_patients(db: Session, search: str | None = None, skip: int = 0, limit: int = 100) -> list[Patient]:
    query = db.query(Patient)
    if search:
        query = query.filter(Patient.full_name.ilike(f"%{search}%"))
    return query.order_by(Patient.full_name).offset(skip).limit(limit).all()


def update_patient(db: Session, patient: Patient, data: PatientUpdate) -> Patient:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient: Patient) -> None:
    db.delete(patient)
    db.commit()
