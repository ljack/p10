# Home Electricity Consumption App

A full-stack application for tracking home electricity consumption, managing device schedules, and monitoring monthly budgets.

## Tech Stack

- **Backend**: Python 3.12+, FastAPI, SQLite, SQLAlchemy
- **Frontend**: Svelte 5 (SvelteKit), TypeScript
- **Database**: SQLite with automatic initialization and seeding

## Features

- **Device Management**: Track devices with type, wattage, and location
- **Consumption Logging**: Record device usage and automatically calculate kWh
- **Smart Scheduling**: Schedule devices by day of week with time ranges
- **Budget Tracking**: Set monthly budgets with alerts and projections
- **Dashboard**: Overview of current month consumption, top devices, and today's schedule
- **Statistics**: Aggregated consumption by device and type with cost calculations

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database models and connection
│   ├── schemas.py           # Pydantic models
│   ├── seed.py              # Database seeding
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── routes/          # SvelteKit pages
│   │   ├── lib/
│   │   │   └── api.ts       # API client
│   │   └── app.css          # Global styles
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.12 or higher
- Node.js 18+ and npm
- Git

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. The database will be automatically created and seeded on first run.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
python main.py
```

The backend API will start on `http://localhost:8000`

- API docs available at: `http://localhost:8000/docs`
- Alternative docs at: `http://localhost:8000/redoc`

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

Open your browser and navigate to `http://localhost:5173`

## Sample Data

On first run, the database is automatically seeded with:

- **8 sample devices** across different types (AC, oven, lights, water heater, PC, refrigerator, washing machine, TV)
- **30 days of consumption data** for all devices
- **7 weekly schedules** for various devices
- **Current month budget** set to 500 kWh at €0.15/kWh

## API Endpoints

### Devices
- `GET /api/devices` - List all devices (filter by type, location)
- `POST /api/devices` - Create a device
- `GET /api/devices/{id}` - Get device with recent consumption
- `PUT /api/devices/{id}` - Update device
- `DELETE /api/devices/{id}` - Soft-delete device

### Consumption
- `GET /api/consumption` - List consumption logs (filter by device, date range)
- `POST /api/consumption` - Log consumption entry
- `GET /api/consumption/stats` - Get aggregated statistics

### Schedules
- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/{id}` - Update schedule
- `DELETE /api/schedules/{id}` - Delete schedule
- `GET /api/schedules/today` - Get today's active schedules

### Budget
- `GET /api/budget` - List all budgets
- `POST /api/budget` - Create budget for a month
- `GET /api/budget/{year_month}` - Get specific budget
- `PUT /api/budget/{year_month}` - Update budget
- `GET /api/budget/{year_month}/status` - Get budget status with projections

## Frontend Pages

1. **Dashboard** (`/`) - Overview of current month with stats, budget gauge, top devices, and today's schedule
2. **Devices** (`/devices`) - Manage devices with add/edit/delete functionality and filters
3. **Consumption** (`/consumption`) - Log new consumption entries and view history with filters
4. **Schedules** (`/schedules`) - Weekly grid view of device schedules with enable/disable toggles
5. **Budget** (`/budget`) - Configure monthly budgets and view usage projections

## Business Logic

- **Auto-calculated kWh**: Consumption is calculated as `(wattage × duration_minutes / 60) / 1000`
- **Soft Deletes**: Deleting devices sets `is_active=false`, preserving consumption history
- **Budget Projections**: End-of-month usage projected based on daily average consumption
- **Alert Thresholds**: Configurable percentage threshold for budget alerts (default: 80%)
- **Flexible Schedules**: Multiple devices can be scheduled simultaneously

## Development

### Backend Development

The backend uses FastAPI with automatic API documentation. After starting the server:

- Interactive docs: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json`

### Frontend Development

The frontend uses SvelteKit with hot module replacement. Changes to `.svelte` files are automatically reflected in the browser.

### Database

The SQLite database file (`electricity.db`) is created in the `backend/` directory. To reset the database, simply delete this file and restart the backend.

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:5173` (default SvelteKit dev server)
- `http://127.0.0.1:5173`

## Error Handling

- Backend returns proper HTTP status codes (200, 201, 204, 400, 404, etc.)
- Error responses include descriptive messages
- Frontend displays error messages via browser alerts

## License

MIT
