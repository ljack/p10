# Setup Guide

This guide will help you get P10 up and running on your system.

## Quick Navigation

- [Quick Start](quick-start.md) - Get running in 5 minutes
- [Installation](installation.md) - Detailed installation steps
- [Configuration](configuration.md) - Environment setup and customization
- [Development Setup](development.md) - Setting up for P10 development
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

## Prerequisites

- **Node.js 18+** (with npm)
- **Git** (for repository operations)
- **Anthropic API Key** (for Claude access)
- **Modern browser** (Chrome, Edge, or Firefox for WebContainers)

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18.0.0 | 20.0.0+ |
| RAM | 4GB | 8GB+ |
| Storage | 2GB free | 10GB+ |
| Network | Broadband | High-speed |

## Installation Methods

### Method 1: Quick Start (Recommended)
```bash
./start-mesh.sh
open http://localhost:3333
```

### Method 2: Individual Components
```bash
# Start Master Daemon
cd p10-master && npm install && npm start

# Start Pi Daemon (in new terminal)
cd p10-pi-daemon && npm install && npm start

# Start Web App (in new terminal)
cd svelteapp && npm install && npm run dev
```

### Method 3: Development Mode
```bash
# Clone and setup
git clone <repository>
cd p10
npm run install:all
npm run dev
```

## Next Steps

1. **[Quick Start Tutorial](quick-start.md)** - Your first P10 project
2. **[Configuration Guide](configuration.md)** - Customize your setup
3. **[Architecture Overview](../architecture/overview.md)** - Understand how it works

## Verification

After installation, verify everything is working:

```bash
# Check system health
curl http://localhost:7777/health
curl http://localhost:7777/status

# Test the mesh
curl -X POST http://localhost:7777/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Are you alive?"}'
```

You should see active daemons and successful responses. If not, check the [troubleshooting guide](troubleshooting.md).