#!/bin/bash
# Stop all P10 daemon mesh processes
echo "Stopping P10 Daemon Mesh..."
lsof -ti :7777 | xargs kill -9 2>/dev/null && echo "  ✅ Master stopped" || echo "  ○ Master not running"
lsof -ti :3333 | xargs kill -9 2>/dev/null && echo "  ✅ SvelteKit stopped" || echo "  ○ SvelteKit not running"
pkill -f "p10-pi-daemon" 2>/dev/null && echo "  ✅ Pi Daemon stopped" || echo "  ○ Pi Daemon not running"
rm -f /tmp/p10-master.json
echo "Done."
