@echo off
REM Vet Appointment Backend Startup Script for Windows

echo ===================================
echo Vet Appointment API - Backend Setup
echo ===================================

REM Check if we're in the project root
if not exist "backend" (
    echo Error: Please run this script from the project root directory
    exit /b 1
)

cd backend

REM Check Python version
echo Checking Python version...
python --version

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q --upgrade pip
pip install -q -r requirements.txt

REM Run the application
echo.
echo ===================================
echo Starting FastAPI server...
echo ===================================
echo API: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo ReDoc: http://localhost:8000/redoc
echo ===================================
echo.

uvicorn src.main:app --reload --port 8000
