from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import appointments, auth, dashboard, patients, rooms, therapists

app = FastAPI(
    title="Speech & Hearing Therapy Scheduler API",
    description="Backend API for scheduling therapy appointments across patients, therapists, and rooms.",
    version="1.0.0",
)

origins = ["*"] if settings.CORS_ORIGINS == "*" else settings.CORS_ORIGINS.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(therapists.router)
app.include_router(rooms.router)
app.include_router(appointments.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}
