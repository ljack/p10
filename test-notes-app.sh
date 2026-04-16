#!/bin/bash

# Notes App Test Script
# Tests both API and frontend build

echo "🧪 Testing Notes App..."

# Test API
echo "📡 Testing Notes API..."
if curl -s http://localhost:3001/api/notes > /dev/null; then
    echo "✅ API server is responding"
    echo "📊 Sample data:"
    curl -s http://localhost:3001/api/notes | jq -r '.data[] | "   - \(.title)"' 2>/dev/null || echo "   (JSON parsing not available, but API responded)"
else
    echo "❌ API server not responding on port 3001"
    echo "💡 Start it with: cd notes-api && node server.js"
fi

echo ""

# Test React build
echo "⚛️  Testing React frontend build..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "⏳ Installing dependencies..."
    npm install > /dev/null 2>&1
fi

echo "🔨 Building React app..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ React app builds successfully"
    echo "📦 Build size:"
    du -sh build/ 2>/dev/null || echo "   Build directory created"
    echo "🎯 Main components:"
    echo "   - NotesList.js (notes display component)"
    echo "   - NotesList.css (responsive styling)"
    echo "   - App.js (main app component)"
else
    echo "❌ React build failed"
    echo "💡 Check for syntax errors in components"
fi

cd ..

echo ""
echo "🚀 To start the full app: ./start-notes-app.sh"
echo "📚 To see component details: cat frontend/src/components/NotesList.js"