# Home Electricity Consumption App

Full-stack application for tracking and managing home electricity consumption.

## Tech Stack

- **Backend**: Python 3.12+, FastAPI, SQLite, SQLAlchemy
- **Frontend**: Svelte 5 (SvelteKit), TypeScript
- **Database**: SQLite with async support (aiosqlite)

## Features

- Device management (add, edit, delete devices)
- Consumption logging and tracking
- Scheduling system for device automation
- Monthly budget tracking with alerts
- Real-time dashboard with statistics
- Consumption breakdown by device and type

## Setup & Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Running the Application

### Quick Start (Using Scripts)

**Terminal 1 - Start Backend:**
```bash
./start-backend.sh
```

**Terminal 2 - Start Frontend:**
```bash
./start-frontend.sh
```

### Manual Start

**Backend (port 8000):**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

The backend will:
- Initialize the SQLite database on first run
- Seed with 8 sample devices and 150 consumption logs
- Create a budget for the current month
- Start the API server at http://localhost:8000

**Frontend (port 5173):**
```bash
cd frontend
npm run dev
```

The frontend will start at http://localhost:5173

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
.
├── backend/
│   ├── database.py      # Database setup and configuration
│   ├── models.py        # SQLAlchemy models
│   ├── main.py          # FastAPI application and endpoints
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.ts   # API client
│   │   ├── routes/      # SvelteKit pages
│   │   └── app.css      # Global styles
│   └── package.json
└── README.md
```

## Pages

1. **Dashboard (/)** - Overview of current month consumption, budget status, top devices, today's schedule
2. **Devices (/devices)** - Manage all devices
3. **Consumption (/consumption)** - Log and view consumption history
4. **Schedules (/schedules)** - Manage device schedules by day
5. **Budget (/budget)** - Set and track monthly budgets

## Data Models

- **Device**: name, type, wattage, location
- **ConsumptionLog**: device, start time, duration, auto-calculated kWh
- **Schedule**: device, day of week, start/end time, enabled flag
- **Budget**: monthly budget in kWh, price per kWh, alert threshold

## Default Seed Data

The app seeds with 8 sample devices and 30 days of consumption data for the current month.
