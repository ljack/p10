# Home Electricity Consumption App

A full-stack application for tracking home electricity consumption, managing device schedules, and monitoring energy budgets.

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
uvicorn main:app --host 0.0.0.0 --port 8000
```

The database is created and seeded with sample data automatically on first run.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — monthly overview, budget gauge, top consumers, today's schedule |
| `/devices` | Device management — list, add, edit, filter by type/location |
| `/consumption` | Consumption tracking — log entries, history, daily bar chart |
| `/schedules` | Weekly schedule grid — create/toggle/delete schedules |
| `/budget` | Monthly budget config — usage gauge, projections, alerts |

## API Endpoints

### Devices
- `GET /api/devices` — list (filter: `?type=`, `?location=`)
- `POST /api/devices` — create
- `GET /api/devices/{id}` — detail with recent consumption
- `PUT /api/devices/{id}` — update
- `DELETE /api/devices/{id}` — soft delete (deactivate)

### Consumption
- `GET /api/consumption` — list logs (filter: `?device_id=`, `?from=`, `?to=`)
- `POST /api/consumption` — log entry (kWh auto-calculated)
- `GET /api/consumption/stats` — aggregated stats (`?period=day|week|month`, `?device_id=`, `?from=`, `?to=`)

### Schedules
- `GET /api/schedules` — list (filter: `?device_id=`)
- `POST /api/schedules` — create
- `PUT /api/schedules/{id}` — update
- `DELETE /api/schedules/{id}` — delete
- `GET /api/schedules/today` — today's active entries with device info

### Budget
- `GET /api/budget` — list all budgets
- `POST /api/budget` — create monthly budget
- `GET /api/budget/{year_month}` — get budget with usage
- `PUT /api/budget/{year_month}` — update
- `GET /api/budget/{year_month}/status` — full status with projections
