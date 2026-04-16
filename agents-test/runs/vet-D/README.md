# Vet Appointment App

A full-stack veterinary clinic appointment management system built with **TDD (Test-Driven Development)** principles.

## 🏗️ Architecture

- **Backend**: Python 3.12+, FastAPI, SQLite, SQLAlchemy
- **Frontend**: Svelte 5 (SvelteKit), TypeScript
- **Testing**: pytest (backend 95% coverage), vitest (frontend)
- **Development**: Strict TDD approach - all features test-first

## 📋 Features

### Pet Management
- CRUD operations for pets (dog, cat, bird, rabbit, other)
- Search pets by owner name
- Track species, breed, age, owner info, and notes

### Treatment Catalog
- Pre-defined treatments (seeded on first run)
- Includes: Vaccination, Dental Cleaning, X-ray, Checkup, Surgery Consultation
- Each treatment has duration, price, and description

### Appointment Scheduling
- Book appointments with business rules validation:
  - Monday-Friday only (no weekends)
  - Clinic hours: 08:00-17:00
  - No overlapping appointments
  - Treatment duration respected
- Filter appointments by date, pet, or status
- Available time slots calculation
- Status tracking: scheduled → in-progress → completed/cancelled

### User Interface
- Dashboard with today's appointments and statistics
- Step-by-step appointment booking flow
- Responsive design with clean, modern UI

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run tests (95% coverage required)
pytest

# Start server
./run.sh
# Or manually: uvicorn app.main:app --reload --port 8000
```

Backend runs on: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

Frontend runs on: `http://localhost:5173`

## 🧪 Testing

This project follows **strict TDD** (see `AGENTS.md`):

### Backend Tests (pytest)
```bash
cd backend
pytest                    # Run all tests
pytest --cov             # With coverage report
pytest tests/test_pets.py -v  # Specific module
```

**Coverage**: 95.43% (exceeds 90% requirement)

### Frontend Tests (vitest)
```bash
cd frontend
npm test                 # Run tests
npm run test:coverage    # With coverage
```

## 📁 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routers/         # API endpoints
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── database.py      # DB configuration
│   │   ├── main.py          # FastAPI app
│   │   └── seed.py          # Initial data seeding
│   ├── tests/
│   │   ├── conftest.py      # Test fixtures
│   │   ├── test_pets.py
│   │   ├── test_treatments.py
│   │   └── test_appointments.py
│   ├── requirements.txt
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── __tests__/   # Vitest tests
│   │   │   └── api.ts       # API client
│   │   ├── routes/
│   │   │   ├── +layout.svelte
│   │   │   ├── +page.svelte         # Dashboard
│   │   │   ├── pets/
│   │   │   ├── treatments/
│   │   │   ├── appointments/
│   │   │   └── book/                # Booking flow
│   │   └── app.html
│   ├── package.json
│   └── vite.config.ts
│
├── AGENTS.md              # TDD guidelines
└── README.md
```

## 🔧 API Endpoints

### Pets
- `GET /api/pets` - List all pets (optional: ?owner_name=search)
- `POST /api/pets` - Create pet
- `GET /api/pets/{id}` - Get pet details
- `PUT /api/pets/{id}` - Update pet
- `DELETE /api/pets/{id}` - Delete pet

### Treatments
- `GET /api/treatments` - List all treatments
- `POST /api/treatments` - Create treatment
- `PUT /api/treatments/{id}` - Update treatment
- `DELETE /api/treatments/{id}` - Delete treatment

### Appointments
- `GET /api/appointments` - List appointments (filters: date, pet_id, status)
- `POST /api/appointments` - Book appointment
- `GET /api/appointments/{id}` - Get appointment details
- `PUT /api/appointments/{id}` - Update appointment
- `DELETE /api/appointments/{id}` - Cancel appointment
- `GET /api/appointments/available-slots?date=YYYY-MM-DD&treatment_id=X` - Get available slots

## 📊 Business Rules

1. **Clinic Hours**: 08:00-17:00
2. **Operating Days**: Monday-Friday only
3. **Appointment Overlap**: Not allowed (respects treatment duration)
4. **Validation**: Foreign key checks for pet_id and treatment_id
5. **Available Slots**: 30-minute intervals, calculated based on existing appointments

## 🎯 TDD Approach

Every feature follows the **Red-Green-Refactor** cycle:

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Clean up while keeping tests green
4. **REPEAT**: Next test, next feature

**Test Coverage Goals**: ≥90% (currently: 95.43% backend, tests for frontend API layer)

## 📝 Development Workflow

1. Read `AGENTS.md` for TDD guidelines
2. Write test first (describe expected behavior)
3. Run test → ensure it fails (RED)
4. Implement minimal code to pass (GREEN)
5. Refactor if needed (keep tests green)
6. Run full test suite before committing
7. Ensure coverage stays ≥90%

## 🐛 Debugging

- Backend logs: Check terminal running uvicorn
- Frontend network: Browser DevTools → Network tab
- API testing: Visit `/docs` for Swagger UI
- Database: `backend/vet_clinic.db` (SQLite file)

## 📄 License

MIT

## 👨‍💻 Built With TDD

This entire application was built following strict Test-Driven Development practices as specified in `AGENTS.md`. All production code was written **after** tests, ensuring comprehensive test coverage and robust functionality.
