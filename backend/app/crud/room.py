import uuid
from sqlalchemy.orm import Session

from app.models.room import Room
from app.schemas.room import RoomCreate, RoomUpdate


def create_room(db: Session, data: RoomCreate) -> Room:
    room = Room(**data.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def get_room(db: Session, room_id: uuid.UUID) -> Room | None:
    return db.query(Room).filter(Room.id == room_id).first()


def list_rooms(db: Session, active_only: bool = False) -> list[Room]:
    query = db.query(Room)
    if active_only:
        query = query.filter(Room.is_active == True)  # noqa: E712
    return query.order_by(Room.name).all()


def update_room(db: Session, room: Room, data: RoomUpdate) -> Room:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
    db.commit()
    db.refresh(room)
    return room


def delete_room(db: Session, room: Room) -> None:
    db.delete(room)
    db.commit()
