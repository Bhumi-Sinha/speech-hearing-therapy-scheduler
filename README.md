# Speech & Hearing Therapy Scheduler

A full-stack scheduling system for a speech-and-hearing therapy clinic. The
admin can see how many patients, therapists, and rooms are in the system, and
book appointments — the system automatically checks therapist availability,
room conflicts, and clinic hours before confirming a booking.

## Tech stack

| Part             | Technology                  | Why                                                                 |
| ----------------- | ---------------------------- | -------------------------------------------------------------------- |
| Backend            | FastAPI (Python)             | Fast, typed, automatic OpenAPI docs, great for this kind of API      |
| Database           | PostgreSQL                   | Relational integrity matters a lot for scheduling data               |
| ORM                | SQLAlchemy + Alembic         | Type-safe queries, versioned schema migrations                       |
| Auth                | JWT (access + refresh) + Argon2id | Stateless auth, modern password hashing                          |
| Frontend            | React + TypeScript (Vite)    | Fast dev server, huge ecosystem, type safety end-to-end               |
| Styling            | Tailwind CSS                 | Fast to build a consistent, custom design system with                |
| Server state        | TanStack Query               | Handles caching/loading/error state for API calls                    |
| Client state        | Zustand                      | Minimal global state (just auth) without boilerplate                 |
| Forms/validation    | React Hook Form + Zod        | Type-safe form validation that matches backend rules                 |
| Containerization    | Docker + Docker Compose      | One command to run the whole stack locally, consistent environments  |
| CI/CD               | GitHub Actions               | Automated lint/test/build on every push                              |

## Project structure

```
speech-hearing-scheduler/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── models/          # SQLAlchemy models (Patient, Therapist, Room, Appointment, User)
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── crud/            # Database access functions
│   │   ├── routers/         # API route handlers
│   │   ├── services/        # scheduler.py — the scheduling rules engine
│   │   ├── core/            # security (JWT, hashing), auth dependencies
│   │   ├── main.py          # FastAPI app entrypoint
│   │   └── seed.py          # demo data seeding script
│   ├── alembic/              # database migrations
│   ├── tests/                 # pytest suite (unit + integration)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # React + TypeScript (Vite) SPA
│   ├── src/
│   │   ├── api/               # axios API client modules
│   │   ├── pages/             # route-level page components
│   │   ├── components/        # reusable UI components
│   │   ├── store/              # Zustand auth store
│   │   └── types/               # TypeScript types mirroring backend schemas
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml         # runs postgres + backend + frontend together
├── .github/workflows/ci.yml   # CI pipeline
└── README.md
```

## Running locally (Docker — recommended)

This is the fastest way to get everything running exactly as it will run in
production later.

1. **Copy the environment files:**

   ```bash
   cp backend/.env.example backend/.env
   ```

   Open `backend/.env` and change `JWT_SECRET_KEY` to a long random string
   (you can generate one with `python -c "import secrets; print(secrets.token_hex(32))"`).

2. **Start everything:**

   ```bash
   docker compose up --build
   ```

   This will:
   - Start PostgreSQL
   - Build and start the backend, run database migrations, and seed demo data
   - Build and start the frontend (served via nginx)

3. **Open the app:**
   - Frontend: http://localhost:5173
   - Backend API docs (Swagger UI): http://localhost:8000/docs

4. **Log in** with the seeded demo admin account:
   - Email: `admin@clinic.com`
   - Password: `Admin@123`

   (Change this immediately in a real deployment — it's only for local demo purposes.)

To stop everything: `docker compose down` (add `-v` to also wipe the database volume).

## Running locally without Docker (for active development)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env - set POSTGRES_HOST=localhost and make sure a local Postgres
# instance is running with matching credentials, OR just run:
#   docker compose up db
# to start only the database container.

alembic upgrade head
python -m app.seed              # optional: creates demo data
uvicorn app.main:app --reload
```

The API will be running at http://localhost:8000, with interactive docs at
`/docs`.

**Running tests:**

```bash
cd backend
pytest -v                       # all tests
pytest -v --cov=app             # with coverage
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_URL defaults to http://localhost:8000
npm run dev
```

The app will be running at http://localhost:5173 with hot reload.

## How the scheduling logic works

All scheduling rules live in `backend/app/services/scheduler.py`, separate
from the API layer so they're easy to test and reason about. Before any
appointment is created or rescheduled, the system checks, in order:

1. **Duration is valid** — between 15 and 180 minutes (configurable via `.env`)
2. **Starts on a clean boundary** — appointments must start on a 15-minute mark
   (e.g. 9:00, 9:15, 9:30 — not 9:07), keeping the schedule tidy
3. **Not in the past**
4. **Within clinic hours** — configurable via `CLINIC_OPEN_HOUR` / `CLINIC_CLOSE_HOUR`
5. **Therapist is available** — if the therapist has weekly availability configured
   (e.g. "Mon–Fri 9am–5pm"), the appointment must fall inside one of those windows
6. **No conflicts** — the same therapist, room, or patient cannot have two
   overlapping *scheduled* appointments (cancelled/no-show appointments don't
   block new bookings)

The `/api/appointments/available-slots` endpoint scans the day in 15-minute
increments and returns every free (therapist, room) combination for a given
duration — this powers the "Find available slots" flow on the New Appointment
page, so the admin picks from a list of guaranteed-valid options instead of
guessing a time and hoping it works.

This logic is covered by 12 automated tests (`backend/tests/`), including a
full end-to-end flow that books an appointment, confirms a double-booking is
correctly rejected with a clear error, cancels it, and confirms the freed
slot can be re-booked.

## GitHub vs. GitLab

Either works fine for a project like this — here's the honest tradeoff:

- **GitHub** is the more common default, has the largest ecosystem, and its
  Actions CI/CD (already set up in this project at `.github/workflows/ci.yml`)
  is free and generous for public and small private repos. If you're not
  already committed to one platform, this is the safer default choice —
  most tutorials, Stack Overflow answers, and third-party integrations
  assume GitHub.
- **GitLab** has CI/CD built in from the start (not a bolt-on), and its free
  tier includes more private CI minutes than GitHub's free tier. It's a
  reasonable choice if you want everything (repo + CI/CD + issue tracking)
  in one self-contained product, or if you might want to self-host later.

**Recommendation for this project:** use GitHub. It's what this repo's CI
pipeline is already configured for, and given you're already using GitHub
Actions-style syntax, switching later would mean rewriting the pipeline.

### Setting up the repo

```bash
cd speech-hearing-scheduler
git init
git add .
git commit -m "Initial commit: full-stack therapy scheduler"

# Create a new repo on GitHub first (via the website or `gh repo create`), then:
git remote add origin https://github.com/<your-username>/speech-hearing-scheduler.git
git branch -M main
git push -u origin main
```

From then on, the CI pipeline in `.github/workflows/ci.yml` will automatically
run backend tests, frontend build/typecheck, and Docker image builds on every
push and pull request to `main` or `develop`.

## Deploying later (cloud)

When you're ready to move off `localhost`:

1. **Database:** use a managed Postgres (AWS RDS, Azure Database for
   PostgreSQL, GCP Cloud SQL, or a simpler option like Railway/Render/Supabase).
2. **Backend:** the existing `backend/Dockerfile` can be deployed as-is to any
   container platform (AWS ECS/Fargate, Azure Container Apps, Google Cloud
   Run, Fly.io, Render). Drop `--reload` from the CMD and set a proper
   `JWT_SECRET_KEY` and `CORS_ORIGINS` in production environment variables.
3. **Frontend:** the `frontend/Dockerfile` builds a static site served by
   nginx — this can run as a container next to the backend, or you can skip
   Docker for it entirely and deploy the `dist/` folder to any static host
   (Vercel, Netlify, Cloudflare Pages, S3+CloudFront). Set `VITE_API_URL` to
   your deployed backend's URL at build time.
4. Put both behind HTTPS (a managed load balancer or Nginx/Caddy with
   Let's Encrypt) before going live with real patient data.

## Environment variables reference

**`backend/.env`** (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `POSTGRES_*` | Database connection details |
| `JWT_SECRET_KEY` | Signs auth tokens — must be a long random secret in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | Session lifetimes |
| `CLINIC_OPEN_HOUR` / `CLINIC_CLOSE_HOUR` | Operating hours enforced by the scheduler |
| `MIN_SESSION_MINUTES` / `MAX_SESSION_MINUTES` | Allowed appointment duration range |
| `SLOT_GRANULARITY_MINUTES` | Appointments must start on this boundary (e.g. 15 min) |

**`frontend/.env`** (see `frontend/.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |
