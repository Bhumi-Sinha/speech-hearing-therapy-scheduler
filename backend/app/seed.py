"""
Populates the database with an initial admin user and some sample rooms /
therapists so the app is immediately usable after `docker compose up`.

Run with:  docker compose exec backend python -m app.seed
"""

from datetime import time

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.room import Room
from app.models.therapist import Specialization, Therapist, TherapistAvailability
from app.models.user import User, UserRole


def run():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@clinic.com").first():
            db.add(
                User(
                    full_name="Clinic Admin",
                    email="admin@clinic.com",
                    hashed_password=hash_password("Admin@123"),
                    role=UserRole.ADMIN,
                )
            )
            print("Created default admin -> admin@clinic.com / Admin@123")

        if db.query(Room).count() == 0:
            db.add_all(
                [
                    Room(name="Therapy Room 1", equipment="Mirror, articulation cards"),
                    Room(name="Therapy Room 2", equipment="Sound booth"),
                    Room(name="Audiology Suite", equipment="Audiometer, tympanometer"),
                ]
            )
            print("Created sample rooms")

        db.commit()

        if db.query(Therapist).count() == 0:
            t1 = Therapist(full_name="Dr. Ananya Rao", specialization=Specialization.SPEECH_THERAPY)
            t2 = Therapist(full_name="Dr. Karan Mehta", specialization=Specialization.AUDIOLOGY)
            db.add_all([t1, t2])
            db.flush()

            for weekday in range(5):  # Mon-Fri
                db.add(
                    TherapistAvailability(
                        therapist_id=t1.id, weekday=weekday, start_time=time(9, 0), end_time=time(17, 0)
                    )
                )
                db.add(
                    TherapistAvailability(
                        therapist_id=t2.id, weekday=weekday, start_time=time(10, 0), end_time=time(18, 0)
                    )
                )
            db.commit()
            print("Created sample therapists with availability")

        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
