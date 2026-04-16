# Vet Appointment App

Full-stack vet appointment application with a FastAPI backend and a SvelteKit frontend.

## Stack

- Backend: Python 3.12+, FastAPI, SQLAlchemy async, SQLite via `aiosqlite`
- Frontend: SvelteKit with Svelte 5 and TypeScript
- Structure: `backend/` and `frontend/`

## Features

- Pet management with owner search
- Treatment management with seeded starter treatments
- Appointment booking, rescheduling, status changes, and cancellation
- Available-slot checking that respects clinic hours and overlapping appointments
- Dashboard with today’s appointments and quick clinic stats
- Local development CORS and frontend API proxying

## Backend setup

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

The SQLite database is created automatically at `backend/vet_clinic.db` on first run, and starter treatments are seeded if the database is empty.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` calls to `http://127.0.0.1:8000`.

## Development workflow

1. Start the backend on port `8000`.
2. Start the frontend on port `5173`.
3. Open `http://localhost:5173`.

## API overview

### Pets

- `GET /api/pets`
- `POST /api/pets`
- `GET /api/pets/{id}`
- `PUT /api/pets/{id}`
- `DELETE /api/pets/{id}`

### Treatments

- `GET /api/treatments`
- `POST /api/treatments`
- `PUT /api/treatments/{id}`
- `DELETE /api/treatments/{id}`

### Appointments

- `GET /api/appointments`
- `POST /api/appointments`
- `GET /api/appointments/{id}`
- `PUT /api/appointments/{id}`
- `DELETE /api/appointments/{id}`
- `GET /api/appointments/available-slots?date=YYYY-MM-DD&treatment_id=X`

## Business rules

- Clinic hours are Monday through Friday from `08:00` to `17:00`
- Appointment overlaps are rejected with `409 Conflict`
- Cancelled appointments free up their slot
- API validation errors return structured HTTP responses with error details
