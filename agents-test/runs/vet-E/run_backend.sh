#!/bin/bash

# Vet Appointment Backend Startup Script

set -e

echo "==================================="
echo "Vet Appointment API - Backend Setup"
echo "==================================="

# Check if we're in the project root
if [ ! -d "backend" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

cd backend

# Check Python version
echo "Checking Python version..."
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Run the application
echo ""
echo "==================================="
echo "Starting FastAPI server..."
echo "==================================="
echo "API: http://localhost:8000"
echo "Docs: http://localhost:8000/docs"
echo "ReDoc: http://localhost:8000/redoc"
echo "==================================="
echo ""

uvicorn src.main:app --reload --port 8000
