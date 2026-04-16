# Quick Start Guide

## Running the Application

### Terminal 1: Backend Server
```bash
cd backend
source venv/bin/activate  # Already set up
./run.sh
```

Backend will be running on `http://localhost:8000`  
API Documentation: `http://localhost:8000/docs`

### Terminal 2: Frontend Server
```bash
cd frontend
npm run dev
```

Frontend will be running on `http://localhost:5173`

## First-Time Setup Verification

### 1. Check Backend Tests
```bash
cd backend
source venv/bin/activate
pytest -v
```

Expected: ✅ **46 tests passed, 92% coverage**

### 2. Check Frontend Tests
```bash
cd frontend
npm test -- --run
```

Expected: ✅ **5 tests passed**

### 3. Access the Application
Open browser to `http://localhost:5173`

### 4. Verify Seeded Data
Navigate to **Treatments** page - should see 5 pre-loaded treatments:
- Vaccination ($75, 30 min)
- Dental Cleaning ($200, 60 min)
- X-ray ($150, 45 min)
- General Checkup ($65, 30 min)
- Surgery Consultation ($120, 45 min)

## Quick Feature Tour

### Add a Pet
1. Go to **Pets** page
2. Click "Add Pet"
3. Fill in form (e.g., Buddy, dog, 3 years, John Doe, 555-1234)
4. Click "Save"

### Book an Appointment
1. Go to **Book Appointment** page
2. **Step 1**: Select the pet you just created
3. **Step 2**: Select a treatment (e.g., Vaccination)
4. **Step 3**: Pick a weekday date and available time slot
5. **Step 4**: Add optional notes and confirm

### View Dashboard
Go to **Dashboard** to see today's appointments and statistics

## Testing the Business Rules

### Try Weekend Booking (Should Fail)
1. Go to Book Appointment
2. Select pet and treatment
3. Pick a Saturday or Sunday
4. Should show "No available slots" (weekends not allowed)

### Try After-Hours Booking (Should Fail)
The system automatically filters out slots:
- Before 08:00
- After 17:00

### Try Overlapping Appointment (Should Fail)
1. Book an appointment at 10:00 AM
2. Try to book another at 10:00 AM same day
3. Should show conflict error

## API Testing with Swagger

Visit `http://localhost:8000/docs` to:
- Test all endpoints interactively
- See request/response schemas
- Validate business rules

### Example API Calls

**Get all pets:**
```bash
curl http://localhost:8000/api/pets
```

**Get available slots:**
```bash
curl "http://localhost:8000/api/appointments/available-slots?date=2024-01-15&treatment_id=1"
```

## Database Location

SQLite database: `backend/vet_clinic.db`

To reset the database:
```bash
cd backend
rm vet_clinic.db
# Restart backend - will recreate and seed
```

## Troubleshooting

### Port Already in Use
**Backend (8000):**
```bash
lsof -ti:8000 | xargs kill -9
```

**Frontend (5173):**
```bash
lsof -ti:5173 | xargs kill -9
```

### Virtual Environment Issues
```bash
cd backend
rm -rf venv
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node Modules Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Development Tips

### Watch Tests (Backend)
```bash
cd backend
source venv/bin/activate
pytest-watch
```

### Watch Tests (Frontend)
```bash
cd frontend
npm test
```

### Code Coverage Report
```bash
cd backend
pytest --cov --cov-report=html
open htmlcov/index.html
```

## Next Steps

- Explore the codebase following TDD principles in `AGENTS.md`
- All production code has corresponding tests
- Try adding a new feature using TDD approach
- Check test files to understand expected behaviors

Enjoy the vet clinic app! 🏥🐕🐈
