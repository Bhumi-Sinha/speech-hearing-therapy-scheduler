import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import therapist as crud
from app.database import get_db
from app.schemas.therapist import TherapistCreate, TherapistOut, TherapistUpdate

router = APIRouter(prefix="/api/therapists", tags=["therapists"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=TherapistOut, status_code=201)
def create_therapist(data: TherapistCreate, db: Session = Depends(get_db)):
    return crud.create_therapist(db, data)


@router.get("", response_model=list[TherapistOut])
def list_therapists(active_only: bool = Query(default=False), db: Session = Depends(get_db)):
    return crud.list_therapists(db, active_only=active_only)


@router.get("/{therapist_id}", response_model=TherapistOut)
def get_therapist(therapist_id: uuid.UUID, db: Session = Depends(get_db)):
    therapist = crud.get_therapist(db, therapist_id)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    return therapist


@router.patch("/{therapist_id}", response_model=TherapistOut)
def update_therapist(therapist_id: uuid.UUID, data: TherapistUpdate, db: Session = Depends(get_db)):
    therapist = crud.get_therapist(db, therapist_id)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    return crud.update_therapist(db, therapist, data)


@router.delete("/{therapist_id}", status_code=204)
def delete_therapist(therapist_id: uuid.UUID, db: Session = Depends(get_db)):
    therapist = crud.get_therapist(db, therapist_id)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    crud.delete_therapist(db, therapist)
