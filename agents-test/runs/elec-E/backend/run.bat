@echo off
REM Startup script for backend (Windows)

echo 🚀 Starting Home Electricity Consumption API...

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📚 Installing dependencies...
pip install -q -r requirements.txt

REM Check if database exists
if not exist "electricity.db" (
    echo 🗄️  Initializing and seeding database...
    set PYTHONPATH=.
    python src\infrastructure\database\seed.py
)

REM Run the application
echo ✅ Starting server on http://localhost:8000
echo 📖 API docs available at http://localhost:8000/docs
echo.
set PYTHONPATH=.
python src\main.py
