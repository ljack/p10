# Home Electricity Consumption Tracker

A full-stack application for tracking and managing home electricity consumption with device management, consumption logging, scheduling, and budget monitoring.

## Tech Stack

- **Backend**: Python 3.9+, FastAPI, SQLite (via aiosqlite)
- **Frontend**: Svelte 5 (SvelteKit), TypeScript
- **Database**: SQLite (file-based, auto-created on startup)

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database initialization and seeding
│   ├── models.py            # Pydantic models for API validation
│   ├── routes/              # API route handlers
│   │   ├── devices.py       # Device CRUD endpoints
│   │   ├── consumption.py   # Consumption logging and stats
│   │   ├── schedules.py     # Schedule management
│   │   └── budget.py        # Budget tracking and projections
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts       # API client functions
│   │   │   └── types.ts     # TypeScript type definitions
│   │   └── routes/          # SvelteKit pages
│   │       ├── +layout.svelte     # App layout with navigation
│   │       ├── +page.svelte       # Dashboard
│   │       ├── devices/           # Devices management
│   │       ├── consumption/       # Consumption logging
│   │       ├── schedules/         # Schedule management
│   │       └── budget/            # Budget monitoring
│   └── package.json
└── README.md
```

## Features

### 1. Dashboard
- Current month consumption overview
- Total kWh and estimated cost
- Budget status with visual gauge
- Top 5 consuming devices
- Today's scheduled device activations

### 2. Devices
- Add, edit, and delete devices
- Track device type, wattage, and location
- Filter by type and location
- Soft delete (preserves historical data)

### 3. Consumption Logging
- Log device usage with start time and duration
- Auto-calculate kWh based on device wattage
- View consumption history with filters
- Daily usage chart (last 14 days)
- Filter by device and date range

### 4. Schedules
- Weekly schedule grid view
- Create schedules for specific days and times
- Enable/disable schedules with toggle
- Visual schedule cards organized by day of week

### 5. Budget Management
- Set monthly budgets with kWh limits
- Configure electricity price per kWh
- Set alert thresholds (e.g., 80%)
- Real-time budget usage tracking
- End-of-month consumption projections
- Visual progress bar with warnings

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   # On macOS/Linux:
   source venv/bin/activate
   
   # On Windows:
   venv\Scripts\activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run the backend server:
   ```bash
   python main.py
   ```

   The backend will:
   - Start on `http://localhost:8000`
   - Create `electricity.db` SQLite database
   - Initialize tables on first run
   - Seed with sample data (8 devices, consumption logs, schedules, and a budget)

6. Verify the backend is running:
   ```bash
   curl http://localhost:8000/health
   ```

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:5173`

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Running Both Services

You need two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

## API Endpoints

### Devices
- `GET /api/devices` - List all devices (filter by type, location)
- `POST /api/devices` - Create device
- `GET /api/devices/{id}` - Get device with recent consumption
- `PUT /api/devices/{id}` - Update device
- `DELETE /api/devices/{id}` - Soft delete device

### Consumption
- `POST /api/consumption` - Log consumption entry
- `GET /api/consumption` - List logs (filter by device_id, date range)
- `GET /api/consumption/stats` - Aggregated statistics

### Schedules
- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/{id}` - Update schedule
- `DELETE /api/schedules/{id}` - Delete schedule
- `GET /api/schedules/today` - Get today's active schedules

### Budget
- `GET /api/budget` - List all budgets
- `POST /api/budget` - Create budget for a month
- `GET /api/budget/{year_month}` - Get budget with usage
- `PUT /api/budget/{year_month}` - Update budget
- `GET /api/budget/{year_month}/status` - Detailed budget status with projections

## Database Schema

### Tables

**devices**
- id, name, type, wattage, location, is_active, created_at

**consumption_logs**
- id, device_id, started_at, duration_minutes, kwh, recorded_at

**schedules**
- id, device_id, day_of_week (0-6), start_time, end_time, enabled

**budgets**
- id, year_month, budget_kwh, price_per_kwh, alert_threshold_percent

## Sample Data

On first run, the application seeds the database with:
- 8 sample devices (AC, oven, heater, PC, TV, refrigerator, etc.)
- 10 consumption log entries from the past week
- 3 sample schedules
- Budget for the current month (300 kWh at €0.15/kWh)

## Development Notes

- Backend uses async SQLite (aiosqlite) for non-blocking database operations
- Frontend uses Svelte 5 with runes mode (modern reactivity)
- API proxy configured in Vite to forward `/api` requests to backend
- CORS enabled for local development
- All timestamps stored in ISO format
- kWh automatically calculated from device wattage × duration

## Troubleshooting

**Backend won't start:**
- Ensure Python 3.9+ is installed
- Check virtual environment is activated
- Verify all dependencies installed: `pip list`

**Frontend won't start:**
- Ensure Node.js is installed (v16+)
- Delete `node_modules` and run `npm install` again
- Check port 5173 is not already in use

**Database issues:**
- Delete `backend/electricity.db` to reset and reseed
- The database will be recreated on next backend startup

**API connection errors:**
- Ensure backend is running on port 8000
- Check browser console for CORS or network errors
- Verify proxy configuration in `frontend/vite.config.ts`

## License

MIT
