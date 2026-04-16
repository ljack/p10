# Build: Home Electricity Consumption App

Build a full-stack home electricity consumption tracking and automation application.

## Tech Stack (mandatory)
- **Backend**: Python 3.12+, FastAPI, SQLite (via `aiosqlite` + `databases` or `sqlalchemy`)
- **Frontend**: Svelte 5 (SvelteKit), TypeScript
- **Structure**: `backend/` and `frontend/` directories at project root

## Data Models

### Device
- `id`: integer, auto-increment
- `name`: string, required (e.g., "Living room AC", "Kitchen oven")
- `type`: string, required (lighting, heating, cooling, appliance, electronics, other)
- `wattage`: integer, required (watts)
- `location`: string, required (room/area name)
- `is_active`: boolean, default true
- `created_at`: datetime, auto

### ConsumptionLog
- `id`: integer, auto-increment
- `device_id`: foreign key → Device
- `started_at`: datetime, required
- `duration_minutes`: integer, required
- `kwh`: float, computed (wattage × duration / 60 / 1000)
- `recorded_at`: datetime, auto

### Schedule
- `id`: integer, auto-increment
- `device_id`: foreign key → Device
- `day_of_week`: integer, 0-6 (Mon-Sun)
- `start_time`: time, required
- `end_time`: time, required
- `enabled`: boolean, default true

### Budget
- `id`: integer, auto-increment
- `year_month`: string, format "YYYY-MM", unique
- `budget_kwh`: float, required
- `price_per_kwh`: float, required (€/kWh)
- `alert_threshold_percent`: integer, default 80

## API Endpoints

```
# Devices
GET    /api/devices               — list all devices (filter by type, location)
POST   /api/devices               — add device
GET    /api/devices/{id}          — get device detail with recent consumption
PUT    /api/devices/{id}          — update device
DELETE /api/devices/{id}          — delete device

# Consumption
POST   /api/consumption           — log consumption entry
GET    /api/consumption           — list logs (filter by device_id, date range)
GET    /api/consumption/stats     — aggregated stats
         ?period=day|week|month
         &device_id=X (optional)
         &from=YYYY-MM-DD (optional)
         &to=YYYY-MM-DD (optional)
       Returns: total_kwh, total_cost, avg_daily_kwh, by_device breakdown, by_type breakdown

# Schedules
GET    /api/schedules             — list all schedules (optionally filter by device_id)
POST   /api/schedules             — create schedule
PUT    /api/schedules/{id}        — update schedule
DELETE /api/schedules/{id}        — delete schedule
GET    /api/schedules/today       — get today's active schedule entries with device info

# Budget
GET    /api/budget                — list all budgets
POST   /api/budget                — set budget for a month
GET    /api/budget/{year_month}   — get budget + current usage for that month
PUT    /api/budget/{year_month}   — update budget
GET    /api/budget/{year_month}/status
       Returns: budget_kwh, used_kwh, used_percent, remaining_kwh,
                projected_end_of_month_kwh, is_over_threshold, estimated_cost
```

### Business Rules
- `kwh` in ConsumptionLog is auto-calculated from device wattage × duration
- Budget status endpoint projects end-of-month usage based on daily average
- Stats endpoint groups consumption by device and by device type
- Schedules can overlap (multiple devices can run simultaneously)
- Deleting a device soft-deletes (sets is_active=false), consumption logs preserved

## Frontend Pages

1. **Dashboard** (`/`) — current month overview: total kWh, cost, budget gauge, top 5 consuming devices, today's schedule
2. **Devices** (`/devices`) — list with consumption badges, add/edit modal, filter by type/location
3. **Consumption** (`/consumption`) — log new entry, history table with filters, simple bar chart of daily usage
4. **Schedules** (`/schedules`) — weekly grid view showing device schedules, toggle enable/disable
5. **Budget** (`/budget`) — monthly budget config, usage vs budget visualization, alert threshold setting

## Requirements
- Backend must initialize SQLite DB on first run (create tables)
- Seed with 5-8 sample devices and some consumption data on first run
- Backend runs on port 8000, frontend on port 5173
- Frontend proxies API calls to backend
- Include `README.md` with setup/run instructions
- Error handling: return proper HTTP status codes with error messages
- CORS configured for local development
