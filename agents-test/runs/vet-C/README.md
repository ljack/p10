# Vet Appointment Application

A full-stack veterinary clinic appointment management system built with FastAPI (backend) and SvelteKit (frontend).

## Features

- **Pet Management**: Add, edit, and manage pet records with owner information
- **Treatment Catalog**: Manage available treatments with pricing and duration
- **Appointment Scheduling**: Book appointments with automatic conflict detection
- **Available Slots**: Smart time slot selection based on clinic hours and existing appointments
- **Dashboard**: View today's appointments and quick statistics
- **Status Tracking**: Track appointment status (scheduled, in-progress, completed, cancelled)

## Tech Stack

### Backend
- Python 3.12+
- FastAPI - Modern async web framework
- SQLAlchemy - ORM with async support
- SQLite - Database (via aiosqlite)
- Pydantic - Data validation

### Frontend
- SvelteKit - Full-stack framework
- Svelte 5 - Reactive UI framework
- TypeScript - Type safety
- Vite - Build tool

## Project Structure

```
.
├── backend/
│   ├── main.py           # FastAPI application and routes
│   ├── database.py       # Database models and setup
│   ├── schemas.py        # Pydantic schemas for validation
│   ├── requirements.txt  # Python dependencies
│   └── vet.db           # SQLite database (auto-generated)
│
└── frontend/
    ├── src/
    │   ├── routes/      # SvelteKit pages
    │   │   ├── +layout.svelte      # Navigation layout
    │   │   ├── +page.svelte        # Dashboard
    │   │   ├── pets/+page.svelte   # Pet management
    │   │   ├── treatments/+page.svelte  # Treatment management
    │   │   ├── appointments/+page.svelte # Appointment list
    │   │   └── book/+page.svelte   # Book new appointment
    │   └── lib/
    │       └── api.ts   # API client functions
    ├── package.json
    └── vite.config.ts
```

## Setup and Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (using Python 3.12):
   ```bash
   python3.12 -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

The backend will be available at `http://localhost:8000`

- API documentation: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup

1. Navigate to the frontend directory:
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

The frontend will be available at `http://localhost:5173`

## Running the Application

1. **Start the backend** (from `backend/` directory):
   ```bash
   source venv/bin/activate
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Start the frontend** (from `frontend/` directory):
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Business Rules

- **Clinic Hours**: Monday-Friday, 08:00-17:00
- **No Overlapping Appointments**: System prevents double-booking
- **Weekend Blocked**: No appointments can be scheduled on weekends
- **Automatic Slot Calculation**: Available slots are calculated in 30-minute increments
- **Treatment Duration**: Each treatment has a specified duration that determines slot length
- **Cancelled Appointments**: Cancelled appointments free up their time slot

## Sample Data

The backend automatically seeds the database with 5 sample treatments on first run:

1. Vaccination (30 min, $75.00)
2. Dental Cleaning (60 min, $150.00)
3. X-Ray (45 min, $120.00)
4. General Checkup (30 min, $60.00)
5. Surgery Consultation (45 min, $90.00)

## API Endpoints

### Pets
- `GET /api/pets` - List all pets (with optional owner_name search)
- `POST /api/pets` - Create new pet
- `GET /api/pets/{id}` - Get pet details
- `PUT /api/pets/{id}` - Update pet
- `DELETE /api/pets/{id}` - Delete pet

### Treatments
- `GET /api/treatments` - List all treatments
- `POST /api/treatments` - Create new treatment
- `PUT /api/treatments/{id}` - Update treatment
- `DELETE /api/treatments/{id}` - Delete treatment

### Appointments
- `GET /api/appointments` - List appointments (filters: date, pet_id, status)
- `POST /api/appointments` - Book new appointment
- `GET /api/appointments/{id}` - Get appointment details
- `PUT /api/appointments/{id}` - Update appointment (reschedule or change status)
- `DELETE /api/appointments/{id}` - Cancel/delete appointment
- `GET /api/appointments/available-slots` - Get available time slots

## Error Handling

The application includes comprehensive error handling:

- **404**: Resource not found
- **400**: Validation errors, business rule violations
- **Conflict Detection**: Prevents overlapping appointments
- **Reference Checks**: Prevents deletion of pets/treatments with existing appointments
- **Clinic Hours Validation**: Ensures appointments are within business hours

## Development Notes

- The database (`vet.db`) is created automatically on first run
- CORS is configured for local development (frontend on port 5173)
- Frontend uses Vite proxy to forward API calls to backend
- All API calls use TypeScript interfaces for type safety
- Svelte 5 features (runes) are used for reactivity

## Troubleshooting

### Backend won't start
- Ensure Python 3.12 is installed: `python3.12 --version`
- Check that all dependencies are installed: `pip list`
- Verify port 8000 is not in use

### Frontend won't start
- Ensure Node.js is installed: `node --version`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check that port 5173 is not in use

### API calls failing
- Verify backend is running on port 8000
- Check browser console for CORS errors
- Ensure the proxy is configured correctly in `vite.config.ts`

## Future Enhancements

Potential features for future development:
- User authentication and authorization
- Email notifications for appointments
- SMS reminders
- Multi-clinic support
- Billing and invoicing
- Medical records and history
- Photo uploads for pets
- Export appointments to calendar (ICS)
