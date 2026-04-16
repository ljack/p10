#!/bin/bash
# Run script for the backend

echo "Starting Vet Clinic API..."
echo ""
echo "Make sure you have:"
echo "1. Activated the virtual environment (source venv/bin/activate)"
echo "2. Installed dependencies (pip install -r requirements.txt)"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
