"""
Full integration test hitting the real FastAPI app through TestClient,
with the DB dependency overridden to an in-memory SQLite database.
This proves the whole stack (routers -> crud -> scheduler -> models) works
together, not just the scheduler in isolation.
"""

import os

os.environ.setdefault("POSTGRES_HOST", "localhost")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models
from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def auth_headers(client):
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Admin",
            "email": "admin@test.com",
            "password": "Passw0rd!123",
        },
    )
    resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Passw0rd!123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_full_scheduling_flow(client):
    headers = auth_headers(client)

    # Create a room
    room = client.post("/api/rooms", json={"name": "Room 1"}, headers=headers).json()

    # Create a therapist with Monday availability
    therapist = client.post(
        "/api/therapists",
        json={
            "full_name": "Dr. Flow",
            "specialization": "speech_therapy",
            "availability_slots": [{"weekday": 0, "start_time": "09:00:00", "end_time": "17:00:00"}],
        },
        headers=headers,
    ).json()

    # Create a patient
    patient = client.post(
        "/api/patients",
        json={
            "full_name": "Test Patient",
            "condition_type": "speech",
        },
        headers=headers,
    ).json()

    from datetime import datetime, timedelta

    today = datetime.utcnow()
    days_ahead = (0 - today.weekday()) % 7 or 7
    monday_10am = (today + timedelta(days=days_ahead)).replace(hour=10, minute=0, second=0, microsecond=0)

    # Book an appointment
    resp = client.post(
        "/api/appointments",
        json={
            "patient_id": patient["id"],
            "therapist_id": therapist["id"],
            "room_id": room["id"],
            "start_time": monday_10am.isoformat(),
            "end_time": (monday_10am + timedelta(minutes=45)).isoformat(),
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    appt = resp.json()
    assert appt["patient"]["full_name"] == "Test Patient"
    assert appt["status"] == "scheduled"

    # Try to double-book the same therapist -> should get 409 conflict
    resp2 = client.post(
        "/api/appointments",
        json={
            "patient_id": patient["id"],
            "therapist_id": therapist["id"],
            "room_id": room["id"],
            "start_time": monday_10am.isoformat(),
            "end_time": (monday_10am + timedelta(minutes=45)).isoformat(),
        },
        headers=headers,
    )
    assert resp2.status_code == 409
    assert resp2.json()["detail"]["code"] == "therapist_conflict"

    # Dashboard summary should reflect the created data
    summary = client.get("/api/dashboard/summary", headers=headers).json()
    assert summary["total_patients"] == 1
    assert summary["total_therapists"] == 1
    assert summary["total_rooms"] == 1

    # Cancel it, then re-booking the same slot should now succeed
    cancel = client.patch(f"/api/appointments/{appt['id']}", json={"status": "cancelled"}, headers=headers)
    assert cancel.status_code == 200

    resp3 = client.post(
        "/api/appointments",
        json={
            "patient_id": patient["id"],
            "therapist_id": therapist["id"],
            "room_id": room["id"],
            "start_time": monday_10am.isoformat(),
            "end_time": (monday_10am + timedelta(minutes=45)).isoformat(),
        },
        headers=headers,
    )
    assert resp3.status_code == 201


def test_unauthenticated_request_rejected(client):
    resp = client.get("/api/patients")
    assert resp.status_code == 401
