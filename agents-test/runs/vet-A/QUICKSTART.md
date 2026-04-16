# Quick Start Guide

Get the Vet Appointment App running in 5 minutes!

## Terminal 1: Backend

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

Backend will run on: **http://localhost:8000**

## Terminal 2: Frontend

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will run on: **http://localhost:5173**

## Open Your Browser

Visit: **http://localhost:5173**

## What to Try First

1. **Dashboard** - See today's appointments (empty on first run)
2. **Pets** - Add your first pet
3. **Treatments** - View pre-seeded treatments
4. **Book Appointment** - Book your first appointment
   - Select the pet you just added
   - Choose a treatment
   - Pick a date and time
   - Confirm!

## API Documentation

While the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Enjoy! 🎉
