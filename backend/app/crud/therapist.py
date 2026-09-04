import uuid

from sqlalchemy.orm import Session, joinedload

from app.models.therapist import Therapist, TherapistAvailability
from app.schemas.therapist import TherapistCreate, TherapistUpdate


def create_therapist(db: Session, data: TherapistCreate) -> Therapist:
    therapist = Therapist(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        specialization=data.specialization,
    )
    db.add(therapist)
    db.flush()  # get therapist.id before inserting child rows

    for slot in data.availability_slots:
        db.add(TherapistAvailability(therapist_id=therapist.id, **slot.model_dump()))

    db.commit()
    db.refresh(therapist)
    return therapist


def get_therapist(db: Session, therapist_id: uuid.UUID) -> Therapist | None:
    return (
        db.query(Therapist)
        .options(joinedload(Therapist.availability_slots))
        .filter(Therapist.id == therapist_id)
        .first()
    )


def list_therapists(
    db: Session, active_only: bool = False, skip: int = 0, limit: int = 100
) -> list[Therapist]:
    query = db.query(Therapist).options(joinedload(Therapist.availability_slots))
    if active_only:
        query = query.filter(Therapist.is_active)
    return query.order_by(Therapist.full_name).offset(skip).limit(limit).all()


def update_therapist(db: Session, therapist: Therapist, data: TherapistUpdate) -> Therapist:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(therapist, field, value)
    db.commit()
    db.refresh(therapist)
    return therapist


def delete_therapist(db: Session, therapist: Therapist) -> None:
    db.delete(therapist)
    db.commit()
