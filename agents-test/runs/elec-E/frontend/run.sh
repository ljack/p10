#!/bin/bash
# Startup script for frontend

echo "🎨 Starting Home Electricity Consumption Frontend..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run development server
echo "✅ Starting development server on http://localhost:5173"
echo ""
npm run dev
