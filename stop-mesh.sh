#!/bin/bash
# Stop all P10 daemon mesh processes
# Uses LISTEN-only filter to avoid killing clients (pi CLI, browsers, etc.)
echo "Stopping P10 Daemon Mesh..."
lsof -ti :7777 -sTCP:LISTEN | xargs kill 2>/dev/null && echo "  ✅ Master stopped" || echo "  ○ Master not running"
lsof -ti :3333 -sTCP:LISTEN | xargs kill 2>/dev/null && echo "  ✅ SvelteKit stopped" || echo "  ○ SvelteKit not running"
pkill -f "p10-pi-daemon/src" 2>/dev/null && echo "  ✅ Pi Daemon stopped" || echo "  ○ Pi Daemon not running"
pkill -f "p10-telegram/src" 2>/dev/null && echo "  ✅ Telegram stopped" || echo "  ○ Telegram not running"
rm -f /tmp/p10-master.json
echo "Done."
