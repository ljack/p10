#!/bin/bash

echo "🔍 Verifying Vet Appointment App Setup..."
echo ""

# Check Python
echo "Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ $PYTHON_VERSION found"
else
    echo "❌ Python 3 not found. Please install Python 3.12+"
    exit 1
fi

# Check Node
echo ""
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION found"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
echo ""
echo "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm $NPM_VERSION found"
else
    echo "❌ npm not found. Please install npm"
    exit 1
fi

# Check directory structure
echo ""
echo "Checking directory structure..."
if [ -d "backend" ] && [ -d "frontend" ]; then
    echo "✅ backend/ and frontend/ directories exist"
else
    echo "❌ Missing required directories"
    exit 1
fi

# Check backend files
echo ""
echo "Checking backend files..."
BACKEND_FILES=(
    "backend/requirements.txt"
    "backend/app/__init__.py"
    "backend/app/main.py"
    "backend/app/models.py"
    "backend/app/schemas.py"
    "backend/app/database.py"
)

for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check frontend files
echo ""
echo "Checking frontend files..."
FRONTEND_FILES=(
    "frontend/package.json"
    "frontend/vite.config.ts"
    "frontend/src/lib/api.ts"
    "frontend/src/routes/+layout.svelte"
    "frontend/src/routes/+page.svelte"
    "frontend/src/routes/pets/+page.svelte"
    "frontend/src/routes/treatments/+page.svelte"
    "frontend/src/routes/appointments/+page.svelte"
    "frontend/src/routes/book/+page.svelte"
)

for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

echo ""
echo "✨ All checks passed! The app structure is ready."
echo ""
echo "Next steps:"
echo "1. Set up backend: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
echo "2. Set up frontend: cd frontend && npm install"
echo "3. See QUICKSTART.md for running instructions"
