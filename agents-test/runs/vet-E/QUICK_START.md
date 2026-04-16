# Quick Start Guide - Vet Appointment App

## 🚀 Get Running in 5 Minutes

### Option 1: Automated Script (Recommended)

#### macOS/Linux
```bash
./run_backend.sh
```

#### Windows
```bash
run_backend.bat
```

This will:
- Create virtual environment
- Install dependencies
- Start the server on port 8000

### Option 2: Manual Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run server
uvicorn src.main:app --reload --port 8000
```

## 🎯 Access Points

Once running, open your browser to:

- **API Root**: http://localhost:8000
- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
- **Alternative API Docs (ReDoc)**: http://localhost:8000/redoc

## ✅ Verify Installation

### 1. Check API is Running

```bash
curl http://localhost:8000
```

Expected response:
```json
{
  "message": "Vet Appointment API",
  "version": "1.0.0"
}
```

### 2. List Seed Treatments

```bash
curl http://localhost:8000/api/v1/treatments
```

Expected: 5 pre-seeded treatments (Vaccination, Dental Cleaning, X-Ray, General Checkup, Surgery)

### 3. Try the Interactive Docs

Visit http://localhost:8000/docs and:
1. Click on "POST /api/v1/pets"
2. Click "Try it out"
3. Enter sample data:
   ```json
   {
     "name": "Buddy",
     "species": "dog",
     "age_years": 3.5,
     "owner_name": "John Doe",
     "owner_phone": "555-1234"
   }
   ```
4. Click "Execute"

You should get a 201 response with the created pet including an ID and HATEOAS links.

## 📊 Sample API Usage

### Create a Pet

```bash
curl -X POST http://localhost:8000/api/v1/pets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Whiskers",
    "species": "cat",
    "age_years": 2.0,
    "owner_name": "Jane Smith",
    "owner_phone": "555-5678"
  }'
```

### List All Pets

```bash
curl http://localhost:8000/api/v1/pets
```

### Search Pets by Owner

```bash
curl "http://localhost:8000/api/v1/pets?owner_name=Jane"
```

### Book an Appointment

```bash
curl -X POST http://localhost:8000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "pet_id": 1,
    "treatment_id": 1,
    "scheduled_at": "2024-02-15T10:00:00",
    "notes": "First vaccination"
  }'
```

### Get Available Time Slots

```bash
curl "http://localhost:8000/api/v1/appointments/available-slots?date=2024-02-15&treatment_id=1"
```

## 🗂️ Database

- **Location**: `backend/vet.db` (created automatically on first run)
- **Type**: SQLite
- **Auto-initialization**: Tables created automatically
- **Seed data**: 5 treatments inserted on first run

To reset the database:
```bash
rm backend/vet.db
# Restart the server - database will be recreated
```

## 🎨 Frontend (Not Yet Implemented)

The frontend structure is prepared but not implemented. To run when ready:

```bash
cd frontend
npm install
npm run dev
```

Expected URL: http://localhost:5173

## 🔍 Troubleshooting

### Port 8000 Already in Use

```bash
# Find and kill the process
lsof -ti:8000 | xargs kill -9

# Or use a different port
uvicorn src.main:app --reload --port 8001
```

### Module Not Found Error

Make sure you're in the backend directory and virtual environment is activated:
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Import Errors

Make sure you run uvicorn from the `backend` directory:
```bash
cd backend
uvicorn src.main:app --reload
```

## 📖 Next Steps

1. **Explore the API**: Use the interactive docs at `/docs`
2. **Read the Architecture**: See `IMPLEMENTATION_NOTES.md` for detailed architecture
3. **Review Code Quality**: Check how Clean Architecture is implemented
4. **Understand Patterns**: See the design patterns in action

## 🏗️ Project Structure

```
.
├── backend/              # ✅ Fully implemented
│   ├── src/
│   │   ├── domain/       # Business logic
│   │   ├── application/  # Use cases
│   │   ├── infrastructure/ # Database
│   │   └── presentation/ # API
│   └── requirements.txt
│
├── frontend/             # ⚠️ Structure only
│   └── package.json
│
├── run_backend.sh        # Quick start script (Unix)
├── run_backend.bat       # Quick start script (Windows)
├── README.md             # Project overview
├── QUICK_START.md        # This file
├── IMPLEMENTATION_NOTES.md  # Detailed architecture docs
└── AGENTS.md             # Requirements specification
```

## 💡 Pro Tips

1. **Rate Limiting**: API is limited to 10 requests/second per client
2. **HATEOAS**: All responses include navigational links - follow them!
3. **Error Codes**: All errors have 4-digit codes - use them for debugging
4. **Business Rules**: Clinic hours are 08:00-17:00, Monday-Friday
5. **Auto-reload**: Code changes automatically reload the server (--reload flag)

## 🧪 Testing (Not Yet Implemented)

Test infrastructure is prepared but tests not written. When implemented:

```bash
cd backend
pytest --cov=src
pytest --hypothesis-profile=thorough
```

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (when running)
- **Architecture**: See `IMPLEMENTATION_NOTES.md`
- **Backend Guide**: See `backend/README.md`
- **Frontend Guide**: See `frontend/README.md`
- **Requirements**: See `AGENTS.md`

## ⚡ Performance

- Target: <50ms per request (performance tests not yet implemented)
- Current: Async SQLAlchemy with SQLite should be fast for development
- Production: Consider PostgreSQL for better concurrent performance

## 🔐 Security Notes

**This is a development version. For production, add:**
- Authentication/Authorization
- Input sanitization (Pydantic helps but add more)
- HTTPS
- Rate limiting per user (not just IP)
- SQL injection protection (SQLAlchemy ORM provides this)
- CSRF protection
- Security headers

## 📞 Support

Having issues? Check:
1. Python version (3.12+ recommended)
2. Virtual environment is activated
3. All dependencies installed
4. Running from correct directory
5. Port 8000 is free

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Server starts without errors
- ✅ http://localhost:8000 returns welcome message
- ✅ http://localhost:8000/docs shows interactive API documentation
- ✅ You can create a pet via the API
- ✅ You can see 5 seeded treatments
- ✅ Database file `vet.db` is created

Enjoy exploring the Clean Architecture implementation! 🚀
