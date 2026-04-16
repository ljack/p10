# Vet Appointment App

A full-stack veterinary clinic appointment management system.

## Tech Stack

- **Backend**: Python 3.12+, FastAPI, SQLite (aiosqlite)
- **Frontend**: SvelteKit (Svelte 5), TypeScript

## Setup & Run

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The database (`vet_clinic.db`) is created automatically on first run with 5 sample treatments seeded.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 and proxies `/api` requests to the backend on port 8000.

## Pages

| Route            | Description                                    |
|------------------|------------------------------------------------|
| `/`              | Dashboard — today's appointments, quick stats  |
| `/pets`          | Pet management — list, search, add/edit/delete |
| `/treatments`    | Treatment catalog — list, add/edit/delete      |
| `/appointments`  | Appointment list with date/status filters      |
| `/book`          | Step-by-step appointment booking wizard        |

## API Endpoints

### Pets
- `GET /api/pets` — list all (optional `?owner_name=` search)
- `POST /api/pets` — create pet
- `GET /api/pets/{id}` — get pet
- `PUT /api/pets/{id}` — update pet
- `DELETE /api/pets/{id}` — delete pet

### Treatments
- `GET /api/treatments` — list all
- `POST /api/treatments` — create
- `PUT /api/treatments/{id}` — update
- `DELETE /api/treatments/{id}` — delete

### Appointments
- `GET /api/appointments` — list (filter: `?date=`, `?pet_id=`, `?status=`)
- `POST /api/appointments` — book appointment
- `GET /api/appointments/{id}` — get detail
- `PUT /api/appointments/{id}` — update (reschedule, change status)
- `DELETE /api/appointments/{id}` — delete
- `GET /api/appointments/available-slots?date=YYYY-MM-DD&treatment_id=X` — free time slots

## Business Rules

- Clinic hours: 08:00–17:00, Monday–Friday
- No overlapping appointments (respects treatment duration)
- Cancelled appointments free up their time slot
- Available slots are generated in 15-minute increments
