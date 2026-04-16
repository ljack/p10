# Installation Guide

Complete installation instructions for P10 across different environments.

## Prerequisites

### Required Software
- **Node.js 18.0.0+** with npm (LTS recommended)
- **Git 2.20+** for repository operations
- **Modern browser** with WebContainers support:
  - Chrome 80+ (recommended)
  - Edge 80+
  - Firefox 90+ (partial support)
  - Safari (not supported)

### Required Services
- **Anthropic API Key** - Get from [console.anthropic.com](https://console.anthropic.com)
- **Internet connection** - For LLM API calls and package downloads

### System Requirements

| Environment | CPU | RAM | Storage | Network |
|-------------|-----|-----|---------|---------|
| **Development** | 2 cores | 4GB | 2GB free | Broadband |
| **Production** | 4+ cores | 8GB+ | 10GB+ free | High-speed |
| **CI/CD** | 2 cores | 4GB | 5GB free | High-speed |

### Operating System Support

| OS | Status | Notes |
|----|--------|-------|
| **macOS 10.15+** | ✅ Fully supported | Native development environment |
| **Ubuntu 20.04+** | ✅ Fully supported | Server deployments |
| **Windows 10+** | ✅ Supported | Use PowerShell or WSL2 |
| **Docker** | ✅ Supported | See [Docker section](#docker-installation) |

## Installation Methods

### Method 1: Quick Install (Recommended)

**1. Clone Repository**
```bash
git clone https://github.com/your-org/p10.git
cd p10
```

**2. Install Dependencies**
```bash
# Install all components
npm run install:all

# Or install manually
cd p10-master && npm install && cd ..
cd p10-pi-daemon && npm install && cd ..
cd p10-telegram && npm install && cd ..
cd svelteapp && npm install && cd ..
```

**3. Start System**
```bash
chmod +x start-mesh.sh
./start-mesh.sh
```

**4. Verify Installation**
```bash
# Check system health
curl http://localhost:7777/health

# Check daemon status
curl http://localhost:7777/status

# Open web interface
open http://localhost:3333
```

### Method 2: Component-by-Component

**1. Master Daemon**
```bash
cd p10-master
npm install
npm run build
npm start &
```

**2. Pi Daemon**
```bash
cd p10-pi-daemon
npm install

# Set environment variables
export ANTHROPIC_API_KEY="your-api-key-here"
export MASTER_URL="ws://localhost:7777"

npm start &
```

**3. Web Application**
```bash
cd svelteapp
npm install
npm run build
npm run preview &
```

**4. Telegram Bot (Optional)**
```bash
cd p10-telegram
npm install

# Set environment variables
export TELEGRAM_BOT_TOKEN="your-bot-token"
export MASTER_URL="ws://localhost:7777"

npm start &
```

### Method 3: Development Mode

**1. Setup Development Environment**
```bash
git clone https://github.com/your-org/p10.git
cd p10

# Install all dependencies
npm run install:all

# Install development tools
npm install -g typescript ts-node nodemon
```

**2. Start in Development Mode**
```bash
# Terminal 1: Master Daemon (with hot reload)
cd p10-master
npm run dev

# Terminal 2: Pi Daemon (with hot reload)
cd p10-pi-daemon
npm run dev

# Terminal 3: Web App (with hot reload)  
cd svelteapp
npm run dev

# Terminal 4: Telegram Bot (optional)
cd p10-telegram
npm run dev
```

### Method 4: Docker Installation

**1. Using Docker Compose (Recommended)**
```bash
# Clone repository
git clone https://github.com/your-org/p10.git
cd p10

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

**2. Individual Docker Containers**
```bash
# Build images
docker build -t p10-master ./p10-master
docker build -t p10-pi-daemon ./p10-pi-daemon
docker build -t p10-web ./svelteapp

# Create network
docker network create p10-mesh

# Start Master Daemon
docker run -d --name p10-master \
  --network p10-mesh \
  -p 7777:7777 \
  p10-master

# Start Pi Daemon
docker run -d --name p10-pi-daemon \
  --network p10-mesh \
  -e ANTHROPIC_API_KEY="your-key" \
  -e MASTER_URL="ws://p10-master:7777" \
  p10-pi-daemon

# Start Web App
docker run -d --name p10-web \
  --network p10-mesh \
  -p 3333:3333 \
  p10-web
```

**3. Docker Compose Configuration**
```yaml
# docker-compose.yml
version: '3.8'
services:
  master:
    build: ./p10-master
    ports:
      - "7777:7777"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      
  pi-daemon:
    build: ./p10-pi-daemon
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - MASTER_URL=ws://master:7777
    depends_on:
      - master
      
  web:
    build: ./svelteapp
    ports:
      - "3333:3333"
    depends_on:
      - master
      
  telegram:
    build: ./p10-telegram
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - MASTER_URL=ws://master:7777
    depends_on:
      - master
```

## Environment Configuration

### Required Environment Variables

**Master Daemon (`p10-master/.env`)**
```bash
# Server configuration
PORT=7777
NODE_ENV=development
LOG_LEVEL=info

# Data storage
DATA_DIR=./data
BOARD_FILE=board.json
MEMORY_FILE=memory.json

# Security
SECURITY_ENABLED=true
APPROVAL_REQUIRED=critical
```

**Pi Daemon (`p10-pi-daemon/.env`)**
```bash
# AI Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=optional-openai-key
DEFAULT_MODEL=claude-3-sonnet-20240229

# Mesh Configuration
MASTER_URL=ws://localhost:7777
DAEMON_ID=pi-daemon-1
RECONNECT_INTERVAL=5000

# Agent Configuration  
DEFAULT_ROLE=planning_agent
MAX_CONTEXT_TOKENS=100000
MAX_OUTPUT_TOKENS=4000
```

**Web App (`svelteapp/.env`)**
```bash
# Development
VITE_MASTER_URL=ws://localhost:7777
VITE_API_BASE=http://localhost:7777

# WebContainer Configuration
VITE_WEBCONTAINER_ENABLED=true
VITE_PREVIEW_PORT=3001
```

**Telegram Bot (`p10-telegram/.env`)**
```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
ALLOWED_USERS=user1,user2,user3

# Mesh Configuration
MASTER_URL=ws://localhost:7777
DAEMON_ID=telegram-bot
```

### API Key Setup

**1. Anthropic API Key**
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and set in environment:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-api03-..."
   ```

**2. Telegram Bot (Optional)**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Set in environment:
   ```bash
   export TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
   ```

## Port Configuration

### Default Ports
| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Master Daemon | 7777 | HTTP/WebSocket | Main API and mesh coordination |
| Web App | 3333 | HTTP | User interface |
| WebContainer | 3001 | HTTP | Live preview (dynamic) |
| Telegram Bot | - | - | Outbound only |

### Port Conflicts
If default ports are in use, configure alternatives:

```bash
# Master Daemon
export PORT=8777

# Web App  
export VITE_PORT=4333

# Update references
export VITE_MASTER_URL=ws://localhost:8777
export MASTER_URL=ws://localhost:8777
```

## Verification

### Health Checks
```bash
# System health
curl http://localhost:7777/health
# Expected: {"status":"ok","timestamp":"..."}

# Full status
curl http://localhost:7777/status  
# Expected: JSON with daemon list and board stats

# Web app
curl http://localhost:3333
# Expected: HTML response

# WebSocket connection
wscat -c ws://localhost:7777
# Expected: Connection established
```

### Test Task Submission
```bash
# Submit test task
curl -X POST http://localhost:7777/task \
  -H "Content-Type: application/json" \
  -d '{"instruction":"Say hello world"}'

# Check board
curl http://localhost:7777/board

# Check messages
curl http://localhost:7777/messages
```

### Browser Test
1. Open http://localhost:3333
2. Add Anthropic API key in settings
3. Type: `Hello, are you working?`
4. Verify response from AI agent

## Troubleshooting Installation

### Common Issues

**"Port already in use"**
```bash
# Find process using port
lsof -i :7777
# Kill if necessary
kill -9 <PID>
# Or change port configuration
```

**"Module not found"**
```bash
# Clear npm cache
npm cache clean --force
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**"WebContainer not supported"**
- Use Chrome or Edge browser
- Enable JavaScript
- Check browser console for errors
- Try incognito mode

**"API key invalid"**
```bash
# Test API key directly
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

**"Daemon not connecting"**
```bash
# Check master daemon logs
tail -f /tmp/p10-master.log

# Check pi daemon logs  
tail -f /tmp/p10-pi.log

# Verify WebSocket connectivity
wscat -c ws://localhost:7777
```

### Log Files
```bash
# Master daemon
tail -f /tmp/p10-master.log

# Pi daemon
tail -f /tmp/p10-pi.log

# Debug events
tail -f /tmp/p10-debug.log

# All logs
tail -f /tmp/p10-*.log
```

### Clean Installation
```bash
# Stop all processes
./stop-mesh.sh

# Clean dependencies
find . -name "node_modules" -exec rm -rf {} +
find . -name "package-lock.json" -delete

# Clean logs
rm -f /tmp/p10-*.log

# Clean data
rm -f ./data/*.json

# Reinstall
npm run install:all
./start-mesh.sh
```

## Next Steps

- **[Configuration Guide](configuration.md)** - Customize your setup
- **[Quick Start](quick-start.md)** - Your first P10 project
- **[Development Setup](development.md)** - Setup for P10 development
- **[Troubleshooting](troubleshooting.md)** - Detailed troubleshooting guide