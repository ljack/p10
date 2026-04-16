# Project Overview

## Home Electricity Consumption Tracking App

A full-stack web application for monitoring and managing home electricity usage.

### What's Built

✅ **Backend API (FastAPI + SQLite)**
- 4 data models: Device, ConsumptionLog, Schedule, Budget
- 20+ REST API endpoints for CRUD operations
- Auto-calculated kWh based on device wattage and duration
- Budget tracking with projections and alerts
- Consumption statistics with device/type breakdowns
- SQLite database with async support

✅ **Frontend (SvelteKit + TypeScript)**
- 5 fully functional pages:
  - Dashboard: Overview, budget gauge, top consumers, today's schedule
  - Devices: List/add/edit/delete devices with filtering
  - Consumption: Log entries, view history
  - Schedules: Weekly grid view for device automation
  - Budget: Monthly budget management with visualization
- Responsive design with modern UI
- Real-time data updates
- Modal-based forms for data entry

✅ **Features**
- Device management (8 types: lighting, heating, cooling, appliance, electronics, other)
- Consumption logging with auto-calculated kWh
- Device scheduling by day of week
- Monthly budget tracking with percentage used
- Alert threshold warnings (default 80%)
- Cost calculations based on kWh price
- Consumption breakdown by device and type
- End-of-month projections

✅ **Seed Data**
- 8 sample devices across different types and locations
- 150 consumption log entries (30 days × 5 devices)
- 1 budget for current month (500 kWh @ €0.15/kWh)

### Quick Start

1. Install dependencies:
   ```bash
   cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
   cd ../frontend && npm install
   ```

2. Run (2 terminals):
   ```bash
   ./start-backend.sh   # Terminal 1
   ./start-frontend.sh  # Terminal 2
   ```

3. Open http://localhost:5173

### Tech Stack
- Backend: Python 3.12+, FastAPI, SQLAlchemy, SQLite
- Frontend: Svelte 5, SvelteKit, TypeScript
- Styling: Custom CSS with gradient effects
- Database: SQLite with aiosqlite

### File Structure
```
.
├── backend/
│   ├── database.py      # DB setup & session management
│   ├── models.py        # SQLAlchemy models
│   ├── main.py          # FastAPI app + all endpoints
│   └── requirements.txt # Python deps
├── frontend/
│   ├── src/
│   │   ├── lib/api.ts   # API client
│   │   ├── app.css      # Global styles
│   │   └── routes/      # SvelteKit pages
│   └── vite.config.ts   # API proxy config
├── start-backend.sh     # Backend launcher
├── start-frontend.sh    # Frontend launcher
└── README.md           # Full documentation
```

### API Highlights
- `GET /api/devices` - List devices
- `POST /api/consumption` - Log usage
- `GET /api/consumption/stats` - Get aggregated stats
- `GET /api/schedules/today` - Today's scheduled devices
- `GET /api/budget/{year_month}/status` - Budget with projections

### Notes
- Database auto-initializes on first run
- CORS configured for local development
- Soft-delete for devices (preserves consumption history)
- Schedules support overlapping device usage
- Budget projections based on daily average × days in month
