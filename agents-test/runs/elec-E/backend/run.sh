#!/bin/bash
# Startup script for backend

echo "🚀 Starting Home Electricity Consumption API..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -q -r requirements.txt

# Check if database exists
if [ ! -f "electricity.db" ]; then
    echo "🗄️  Initializing and seeding database..."
    PYTHONPATH=. python src/infrastructure/database/seed.py
fi

# Run the application
echo "✅ Starting server on http://localhost:8000"
echo "📖 API docs available at http://localhost:8000/docs"
echo ""
PYTHONPATH=. python src/main.py
