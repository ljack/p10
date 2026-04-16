#!/bin/bash

# Notes App Startup Script
# Starts both the API server and React frontend

echo "🚀 Starting Notes App..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping servers..."
    pkill -f "node.*server.js" 2>/dev/null
    pkill -f "react-scripts start" 2>/dev/null
    exit 0
}

# Trap signals to cleanup
trap cleanup SIGINT SIGTERM

# Check if API server is already running
if curl -s http://localhost:3001/api/notes > /dev/null 2>&1; then
    echo "✅ API server already running on port 3001"
else
    echo "🔧 Starting Notes API server on port 3001..."
    cd notes-api && node server.js &
    API_PID=$!
    cd ..
    
    # Wait for API to start
    echo "⏳ Waiting for API server to start..."
    for i in {1..10}; do
        if curl -s http://localhost:3001/api/notes > /dev/null 2>&1; then
            echo "✅ API server is ready!"
            break
        fi
        echo "   Attempt $i/10..."
        sleep 2
    done
fi

# Check if React server is already running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ React frontend already running on port 3000"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   API:      http://localhost:3001/api/notes"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    wait
else
    echo "🔧 Starting React frontend on port 3000..."
    cd frontend && npm start &
    REACT_PID=$!
    cd ..
    
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   API:      http://localhost:3001/api/notes"
    echo ""
    echo "📝 The Notes App is starting up..."
    echo "   - API server with sample notes"
    echo "   - React frontend with NotesList component"
    echo "   - Responsive design for all devices"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    
    # Wait for both processes
    wait
fi