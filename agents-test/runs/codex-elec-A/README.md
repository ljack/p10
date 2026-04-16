# Home Electricity Consumption App

Full-stack home electricity tracking and automation planner built with FastAPI, SQLite, and SvelteKit.

## Stack

- Backend: Python 3.12+, FastAPI, SQLAlchemy async, SQLite via `aiosqlite`
- Frontend: Svelte 5, SvelteKit, TypeScript
- Project layout:
  - `backend/`
  - `frontend/`

## Features

- Device CRUD with soft-delete behavior
- Consumption logging with automatic kWh calculation from wattage and duration
- Consumption stats with daily, weekly, and monthly aggregation
- Weekly schedule planning with same-day overlap support
- Monthly budget setup with projected end-of-month usage and threshold alerts
- Automatic database initialization and first-run seed data
- Frontend API proxying through SvelteKit

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Notes:

- The SQLite database file is created automatically at `backend/electricity.db`
- Tables and seed data are created on first startup
- Local CORS is enabled for `http://localhost:5173` and `http://127.0.0.1:5173`

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on port `5173`.

## How frontend proxying works

The SvelteKit route at `frontend/src/routes/api/[...path]/+server.ts` forwards frontend `/api/*` requests to the backend on `http://127.0.0.1:8000`.

## Main pages

- `/` dashboard with current-month usage, budget gauge, top devices, and today's schedules
- `/devices` device list with filters and add/edit modal
- `/consumption` new usage entry form, filters, history table, and daily usage chart
- `/schedules` weekly schedule grid with enable/disable controls
- `/budget` monthly budget editor and status view

## API overview

Implemented backend routes:

- `GET /api/devices`
- `POST /api/devices`
- `GET /api/devices/{id}`
- `PUT /api/devices/{id}`
- `DELETE /api/devices/{id}`
- `POST /api/consumption`
- `GET /api/consumption`
- `GET /api/consumption/stats`
- `GET /api/schedules`
- `POST /api/schedules`
- `PUT /api/schedules/{id}`
- `DELETE /api/schedules/{id}`
- `GET /api/schedules/today`
- `GET /api/budget`
- `POST /api/budget`
- `GET /api/budget/{year_month}`
- `PUT /api/budget/{year_month}`
- `GET /api/budget/{year_month}/status`

## Development notes

- Backend responses return structured HTTP errors with appropriate status codes
- Device deletion is implemented as a soft-delete by setting `is_active=false`
- Consumption logs are preserved even after a device is deactivated
- Budget cost calculations use the matching month budget price when available
