# Build: Vet Appointment App

Build a full-stack vet appointment application.

## Tech Stack (mandatory)
- **Backend**: Python 3.12+, FastAPI, SQLite (via `aiosqlite` + `databases` or `sqlalchemy`)
- **Frontend**: Svelte 5 (SvelteKit), TypeScript
- **Structure**: `backend/` and `frontend/` directories at project root

## Data Models

### Pet
- `id`: integer, auto-increment
- `name`: string, required
- `species`: string, required (dog, cat, bird, rabbit, other)
- `breed`: string, optional
- `age_years`: float, required
- `owner_name`: string, required
- `owner_phone`: string, required
- `notes`: text, optional

### Treatment
- `id`: integer, auto-increment
- `name`: string, required (e.g., "Vaccination", "Dental cleaning", "X-ray")
- `duration_minutes`: integer, required
- `description`: text, optional
- `price`: decimal, required

### Appointment
- `id`: integer, auto-increment
- `pet_id`: foreign key → Pet
- `treatment_id`: foreign key → Treatment
- `scheduled_at`: datetime, required
- `status`: enum (scheduled, in-progress, completed, cancelled)
- `notes`: text, optional
- `created_at`: datetime, auto

## API Endpoints

```
GET    /api/pets                  — list all pets (with search by owner_name)
POST   /api/pets                  — create pet
GET    /api/pets/{id}             — get pet detail
PUT    /api/pets/{id}             — update pet
DELETE /api/pets/{id}             — delete pet

GET    /api/treatments            — list all treatments
POST   /api/treatments            — create treatment
PUT    /api/treatments/{id}       — update treatment
DELETE /api/treatments/{id}       — delete treatment

GET    /api/appointments          — list appointments (filter by: date, pet_id, status)
POST   /api/appointments          — book appointment
GET    /api/appointments/{id}     — get appointment detail
PUT    /api/appointments/{id}     — update appointment (reschedule, change status)
DELETE /api/appointments/{id}     — cancel appointment

GET    /api/appointments/available-slots?date=YYYY-MM-DD&treatment_id=X
                                  — get available time slots for a given date and treatment
```

### Business Rules
- Clinic hours: 08:00–17:00, Monday–Friday
- No overlapping appointments (respect treatment duration)
- Available slots endpoint must check existing appointments and return free windows
- Cancelled appointments free up their slot

## Frontend Pages

1. **Dashboard** (`/`) — today's appointments, quick stats (total pets, upcoming appointments)
2. **Pets** (`/pets`) — list, search, add/edit pet modal or page
3. **Treatments** (`/treatments`) — list, add/edit treatments
4. **Appointments** (`/appointments`) — calendar/list view, filter by date/status
5. **Book Appointment** (`/book`) — select pet → select treatment → pick available slot → confirm

## Requirements
- Backend must initialize SQLite DB on first run (create tables)
- Seed with 3-5 sample treatments on first run
- Backend runs on port 8000, frontend on port 5173
- Frontend proxies API calls to backend
- Include `README.md` with setup/run instructions
- Error handling: return proper HTTP status codes with error messages
- CORS configured for local development
