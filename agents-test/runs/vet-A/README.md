# Vet Appointment Application

A full-stack veterinary clinic appointment management system built with FastAPI (backend) and SvelteKit (frontend).

## Features

- **Pet Management**: Add, edit, and search pets with owner information
- **Treatment Catalog**: Manage available treatments with pricing and duration
- **Appointment Booking**: Smart booking system with:
  - Automatic conflict detection
  - Available time slot calculation
  - Clinic hours enforcement (Mon-Fri, 8:00-17:00)
  - Step-by-step booking wizard
- **Dashboard**: Today's appointments overview with statistics
- **Appointment Management**: View, filter, and update appointment status

## Tech Stack

### Backend
- Python 3.12+
- FastAPI - Modern async web framework
- SQLAlchemy - ORM for database operations
- SQLite - Database (via aiosqlite)
- Pydantic - Data validation

### Frontend
- SvelteKit - Full-stack Svelte framework
- Svelte 5 - Reactive UI library
- TypeScript - Type-safe JavaScript
- Vite - Build tool and dev server

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # FastAPI app and endpoints
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   └── database.py     # Database configuration
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.ts      # API client functions
│   │   └── routes/
│   │       ├── +layout.svelte
│   │       ├── +page.svelte          # Dashboard
│   │       ├── pets/+page.svelte     # Pet management
│   │       ├── treatments/+page.svelte
│   │       ├── appointments/+page.svelte
│   │       └── book/+page.svelte     # Booking wizard
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.12 or higher
- Node.js 18+ and npm
- Git (optional)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

The backend will start on **http://localhost:8000**

- API documentation (Swagger UI): http://localhost:8000/docs
- Alternative API docs (ReDoc): http://localhost:8000/redoc

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

The frontend will start on **http://localhost:5173**

## Usage

### First Run

On first startup, the backend automatically:
- Creates the SQLite database (`vet_clinic.db`)
- Initializes database tables
- Seeds sample treatments:
  - Vaccination ($75, 15 min)
  - Dental Cleaning ($250, 60 min)
  - X-Ray ($150, 30 min)
  - General Checkup ($60, 20 min)
  - Surgery Consultation ($100, 45 min)

### Managing Pets

1. Go to **Pets** page
2. Click "Add Pet" to register a new pet
3. Fill in required fields:
   - Name, species, age
   - Owner name and phone
   - Optional: breed, notes
4. Search pets by owner name
5. Edit or delete existing pets

### Booking Appointments

1. Go to **Book Appointment**
2. Follow the 4-step wizard:
   - **Step 1**: Select a pet
   - **Step 2**: Choose a treatment
   - **Step 3**: Pick a date and time slot
   - **Step 4**: Review and confirm

The system automatically:
- Shows only available time slots
- Prevents double-booking
- Enforces clinic hours (Mon-Fri, 8:00-17:00)
- Validates appointment conflicts

### Managing Appointments

1. Go to **Appointments** page
2. Filter by date or status
3. Update appointment status inline
4. Cancel appointments as needed

Status options:
- **Scheduled** - Newly booked
- **In Progress** - Currently being serviced
- **Completed** - Finished
- **Cancelled** - Freed up the time slot

## API Endpoints

### Pets
- `GET /api/pets` - List all pets (query: `?owner_name=search`)
- `POST /api/pets` - Create new pet
- `GET /api/pets/{id}` - Get pet details
- `PUT /api/pets/{id}` - Update pet
- `DELETE /api/pets/{id}` - Delete pet

### Treatments
- `GET /api/treatments` - List all treatments
- `POST /api/treatments` - Create treatment
- `PUT /api/treatments/{id}` - Update treatment
- `DELETE /api/treatments/{id}` - Delete treatment

### Appointments
- `GET /api/appointments` - List appointments (filters: `date`, `pet_id`, `status`)
- `POST /api/appointments` - Book appointment
- `GET /api/appointments/{id}` - Get appointment details
- `PUT /api/appointments/{id}` - Update appointment
- `DELETE /api/appointments/{id}` - Cancel appointment
- `GET /api/appointments/available-slots` - Get available time slots (params: `date`, `treatment_id`)

## Business Rules

- **Clinic Hours**: Monday-Friday, 8:00 AM - 5:00 PM
- **Time Slots**: Generated in 15-minute increments
- **No Overlaps**: System prevents double-booking
- **Cancellations**: Cancelled appointments free up their time slot
- **Validation**: All required fields are validated on both frontend and backend

## Development

### Backend Development

- FastAPI auto-reload is enabled in development
- Database: `vet_clinic.db` (SQLite file in backend directory)
- Logs: Check terminal for SQL queries and request logs

### Frontend Development

- Hot module replacement (HMR) enabled
- API proxy configured to forward `/api/*` to backend
- TypeScript strict mode enabled

## Troubleshooting

### Backend won't start
- Check Python version: `python --version` (need 3.12+)
- Verify virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend won't start
- Check Node version: `node --version` (need 18+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check if port 5173 is available

### Database issues
- Delete `vet_clinic.db` to reset database
- Backend will recreate and reseed on next startup

### CORS errors
- Ensure backend is running on port 8000
- Ensure frontend is running on port 5173
- Check CORS configuration in `backend/app/main.py`

## Production Deployment

For production deployment:

1. **Backend**:
   - Use proper WSGI server (e.g., Gunicorn with Uvicorn workers)
   - Configure proper database (PostgreSQL recommended)
   - Set environment variables for configuration
   - Enable HTTPS

2. **Frontend**:
   - Build: `npm run build`
   - Preview: `npm run preview`
   - Serve static files with nginx or similar
   - Update API_BASE in `api.ts` to production URL

## License

MIT License - feel free to use for your own projects!
