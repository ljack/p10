# Quick Start Guide

## First-Time Setup

### Backend
```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Using startup scripts (recommended)

Terminal 1:
```bash
./start-backend.sh
```

Terminal 2:
```bash
./start-frontend.sh
```

### Option 2: Manual start

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

## Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Testing the API

Run the test script:
```bash
./test_api.sh
```

## Pages

1. **Dashboard** (/) - View today's appointments and statistics
2. **Pets** (/pets) - Manage pet records
3. **Treatments** (/treatments) - Manage treatment types
4. **Appointments** (/appointments) - View and manage appointments
5. **Book Appointment** (/book) - Multi-step booking wizard

## Sample Data

The backend automatically creates 5 sample treatments on first run:
- Vaccination ($75, 30 min)
- Dental Cleaning ($150, 60 min)
- X-Ray ($120, 45 min)
- General Checkup ($60, 30 min)
- Surgery Consultation ($90, 45 min)

## Typical Workflow

1. Add a pet in the Pets page
2. Go to Book Appointment
3. Select the pet
4. Choose a treatment
5. Pick a date and time slot
6. Confirm the booking
7. View the appointment in Dashboard or Appointments page
8. Update status as needed (scheduled → in-progress → completed)
