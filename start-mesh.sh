#!/bin/bash
# Start the P10 daemon mesh: Master + Pi Daemon + SvelteKit app
# Usage: ./start-mesh.sh

set -e

echo "🔗 Starting P10 Daemon Mesh..."
echo ""

# Kill any existing processes
lsof -ti :7777 | xargs kill -9 2>/dev/null || true
lsof -ti :3333 | xargs kill -9 2>/dev/null || true
sleep 1

# 1. Start Master Daemon
echo "  1/3 Starting Master Daemon (port 7777)..."
cd "$(dirname "$0")/p10-master"
nohup npx tsx src/index.ts > /tmp/p10-master.log 2>&1 &
MASTER_PID=$!
sleep 2

if curl -s http://localhost:7777/health > /dev/null 2>&1; then
  echo "       ✅ Master running (PID $MASTER_PID)"
else
  echo "       ❌ Master failed to start"
  exit 1
fi

# 2. Start Pi Daemon
echo "  2/3 Starting Pi Daemon..."
cd "$(dirname "$0")/p10-pi-daemon"
nohup npx tsx src/index.ts > /tmp/p10-pi.log 2>&1 &
PI_PID=$!
sleep 3
echo "       ✅ Pi Daemon started (PID $PI_PID)"

# 3. Start SvelteKit app
echo "  3/3 Starting SvelteKit app (port 3333)..."
cd "$(dirname "$0")/svelteapp"
nohup npx vite dev --port 3333 > /tmp/vite.log 2>&1 &
VITE_PID=$!
sleep 2

if curl -s http://localhost:3333/ > /dev/null 2>&1; then
  echo "       ✅ SvelteKit running (PID $VITE_PID)"
else
  echo "       ⚠️  SvelteKit starting..."
fi

echo ""
echo "  ┌──────────────────────────────────────┐"
echo "  │  P10 Daemon Mesh Running             │"
echo "  │                                      │"
echo "  │  Master:   http://localhost:7777      │"
echo "  │  App:      http://localhost:3333      │"
echo "  │  Status:   http://localhost:7777/status│"
echo "  │  Debug:    http://localhost:3333/api/debug│"
echo "  │  Stream:   curl -N localhost:3333/api/debug/ws│"
echo "  │                                      │"
echo "  │  Logs:                                │"
echo "  │    Master: tail -f /tmp/p10-master.log│"
echo "  │    Pi:     tail -f /tmp/p10-pi.log    │"
echo "  │    App:    tail -f /tmp/vite.log      │"
echo "  │    Debug:  tail -f /tmp/p10-debug.log │"
echo "  └──────────────────────────────────────┘"
echo ""
echo "  Open http://localhost:3333 in your browser."
echo "  The Browser Daemon will auto-connect to the mesh."
echo ""
echo "  Press Ctrl+C to stop all daemons."

# Cleanup on exit
trap "echo 'Stopping mesh...'; kill $MASTER_PID $PI_PID $VITE_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait
wait
