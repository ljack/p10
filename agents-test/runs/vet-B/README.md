# Vet Appointment Application

Full-stack veterinary clinic appointment management system.

## Tech Stack

- Backend: Python 3.12+, FastAPI, SQLite
- Frontend: Svelte 5, SvelteKit, TypeScript

## Quick Start

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs on http://localhost:8000
API docs available at http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Features

- Pet Management: Add, edit, delete, and search pets
- Treatment Catalog: Manage available treatments and pricing
- Appointment Booking: Smart scheduling with availability checking
- Dashboard: Quick overview of daily appointments and stats
- Business Rules:
  - Clinic hours: 8:00 AM - 5:00 PM, Monday-Friday
  - No overlapping appointments
  - Automatic slot availability calculation

## API Endpoints

### Pets
- GET /api/pets - List all pets (search by owner_name)
- POST /api/pets - Create pet
- GET /api/pets/{id} - Get pet detail
- PUT /api/pets/{id} - Update pet
- DELETE /api/pets/{id} - Delete pet

### Treatments
- GET /api/treatments - List all treatments
- POST /api/treatments - Create treatment
- PUT /api/treatments/{id} - Update treatment
- DELETE /api/treatments/{id} - Delete treatment

### Appointments
- GET /api/appointments - List appointments (filter by date, pet_id, status)
- POST /api/appointments - Book appointment
- GET /api/appointments/{id} - Get appointment detail
- PUT /api/appointments/{id} - Update appointment
- DELETE /api/appointments/{id} - Cancel appointment
- GET /api/appointments/available-slots - Get available time slots

## Database

SQLite database (vet_clinic.db) is auto-created on first run with 5 sample treatments.

## Development Notes

- Backend auto-reloads on code changes
- Frontend has hot module replacement
- CORS configured for local development
- Database seeded with sample treatments on startup
