# Development Setup

Guide for setting up a P10 development environment.

## Prerequisites

- Node.js 18+ with npm
- Git 2.20+
- VS Code (recommended) or similar editor
- Anthropic API key

## Clone & Install

```bash
# Clone repository
git clone https://github.com/your-org/p10.git
cd p10

# Install all dependencies
cd p10-master && npm install && cd ..
cd p10-pi-daemon && npm install && cd ..
cd p10-telegram && npm install && cd ..
cd svelteapp && npm install && cd ..

# Or use the install script
npm run install:all
```

## Environment Setup

Create `.env` files for each component:

**p10-master/.env**
```bash
PORT=7777
NODE_ENV=development
LOG_LEVEL=debug
```

**p10-pi-daemon/.env**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
MASTER_URL=ws://localhost:7777
```

**svelteapp/.env**
```bash
VITE_MASTER_URL=ws://localhost:7777
```

## Development Mode

Start each component with hot reload:

```bash
# Terminal 1: Master Daemon
cd p10-master
npm run dev

# Terminal 2: Pi Daemon
cd p10-pi-daemon
npm run dev

# Terminal 3: Web App
cd svelteapp
npm run dev
```

Or use the convenience script:
```bash
./start-mesh.sh --dev
```

## Project Structure

```
p10/
├── p10-master/          # Master Daemon
│   ├── src/
│   │   ├── index.ts     # HTTP/WebSocket server
│   │   ├── registry.ts  # Daemon management
│   │   ├── router.ts    # Message routing
│   │   └── ...
│   └── package.json
│
├── p10-pi-daemon/       # Pi Daemon
│   ├── src/
│   │   ├── index.ts     # Agent session
│   │   ├── roles.ts     # Agent roles
│   │   └── ...
│   └── package.json
│
├── p10-telegram/        # Telegram Bot
│   ├── src/
│   │   └── index.ts
│   └── package.json
│
├── svelteapp/           # Web Application
│   ├── src/
│   │   ├── lib/
│   │   │   ├── daemon/  # Browser daemon
│   │   │   ├── components/
│   │   │   └── sandbox/ # WebContainer
│   │   └── routes/
│   └── package.json
│
├── .pi/extensions/      # CLI Tools
├── docs/                # Documentation
└── start-mesh.sh        # Startup script
```

## Testing

### Unit Tests
```bash
cd svelteapp
npm run test:unit
```

### E2E Tests
```bash
cd svelteapp
npm run test:e2e
```

### Integration Tests
```bash
# Start mesh first
./start-mesh.sh

# Run integration tests
npm run test:integration
```

## Debugging

### Log Files
```bash
# Master daemon
tail -f /tmp/p10-master.log

# Pi daemon
tail -f /tmp/p10-pi.log

# All logs
tail -f /tmp/p10-*.log
```

### VS Code Launch Config
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Master",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/p10-master",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Pi Daemon",
      "type": "node", 
      "request": "launch",
      "cwd": "${workspaceFolder}/p10-pi-daemon",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Endpoints
```bash
# System status
curl http://localhost:7777/status | jq

# Browser debug snapshot
curl http://localhost:7777/debug | jq

# Event bus history
curl http://localhost:7777/events | jq
```

## Code Style

### TypeScript
- Strict mode enabled
- ES modules
- Async/await for all async operations

### Formatting
```bash
# Format all files
npm run format

# Lint
npm run lint
```

### Commit Convention
```
feat: Add new feature
fix: Bug fix
docs: Documentation update
refactor: Code refactoring
test: Add tests
chore: Maintenance
```

## Adding Features

### New Mesh Tool
1. Create file in `.pi/extensions/`
2. Export tool definition
3. Register in extension manifest

### New Message Type
1. Add type to `p10-master/src/types.ts`
2. Add handler in `router.ts`
3. Update WebSocket clients

### New API Endpoint
1. Add route in `p10-master/src/index.ts`
2. Implement handler
3. Update API documentation

## Troubleshooting

### Port Already in Use
```bash
lsof -i :7777
kill -9 <PID>
```

### Module Not Found
```bash
rm -rf node_modules package-lock.json
npm install
```

### WebSocket Issues
```bash
# Test connection
wscat -c ws://localhost:7777
```

## Useful Commands

```bash
# Start everything
./start-mesh.sh

# Stop everything
./stop-mesh.sh

# Restart master (daemons auto-reconnect)
curl -X POST http://localhost:7777/restart

# Check health
curl http://localhost:7777/health

# View board
curl http://localhost:7777/board | jq

# Submit test task
curl -X POST http://localhost:7777/task \
  -H "Content-Type: application/json" \
  -d '{"instruction":"Say hello"}'
```

## Next Steps

- **[Architecture](../architecture/overview.md)** - Understand system design
- **[API Reference](../api/rest-api.md)** - Build integrations
- **[Troubleshooting](troubleshooting.md)** - Solve issues