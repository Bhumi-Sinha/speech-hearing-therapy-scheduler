import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import room as crud
from app.database import get_db
from app.schemas.room import RoomCreate, RoomOut, RoomUpdate

router = APIRouter(prefix="/api/rooms", tags=["rooms"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=RoomOut, status_code=201)
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    return crud.create_room(db, data)


@router.get("", response_model=list[RoomOut])
def list_rooms(active_only: bool = Query(default=False), db: Session = Depends(get_db)):
    return crud.list_rooms(db, active_only=active_only)


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: uuid.UUID, db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.patch("/{room_id}", response_model=RoomOut)
def update_room(room_id: uuid.UUID, data: RoomUpdate, db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return crud.update_room(db, room, data)


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: uuid.UUID, db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    crud.delete_room(db, room)
