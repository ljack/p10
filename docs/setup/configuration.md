# Configuration Guide

Comprehensive configuration options for customizing P10 to your needs.

## Configuration Overview

P10 configuration is spread across multiple components, each with its own configuration file and environment variables. This guide covers all configurable aspects of the system.

## Master Daemon Configuration

### Environment Variables
**File:** `p10-master/.env`

```bash
# Server Configuration
PORT=7777                    # HTTP/WebSocket server port
HOST=localhost               # Server host (0.0.0.0 for external access)
NODE_ENV=development         # Environment mode
LOG_LEVEL=info              # Logging level (debug, info, warn, error)

# Data Storage
DATA_DIR=./data             # Data storage directory
BOARD_FILE=board.json       # Kanban board persistence file
MEMORY_FILE=memory.json     # Memory system data file
ARCHIVE_DIR=./archives      # Archived task storage

# Security
SECURITY_ENABLED=true       # Enable security checks
APPROVAL_REQUIRED=critical  # Risk level requiring approval (low|medium|high|critical)
MAX_TASK_SIZE=1048576      # Maximum task payload size (bytes)

# Board Management
MAX_BOARD_TASKS=30         # Maximum active board tasks
ARCHIVE_AFTER_HOURS=0.5    # Hours before archiving completed tasks
GROOMING_INTERVAL=300      # Grooming cycle interval (seconds)
MEMORY_COMPRESSION_MIN=3   # Minimum archives to create memory

# Pipeline Configuration
MAX_CONCURRENT_PIPELINES=5  # Maximum simultaneous pipelines
PIPELINE_TIMEOUT=3600      # Pipeline timeout (seconds)
DECOMPOSER_MODEL=claude-3-sonnet-20240229  # Model for task decomposition

# Event System
MAX_EVENT_HISTORY=1000     # Maximum events to keep in memory
EVENT_RETENTION_DAYS=7     # Days to retain events
```

### Advanced Configuration
**File:** `p10-master/config/production.json`

```json
{
  "server": {
    "port": 7777,
    "host": "0.0.0.0",
    "cors": {
      "origin": ["http://localhost:3333", "https://your-domain.com"],
      "credentials": true
    },
    "rateLimit": {
      "windowMs": 900000,
      "max": 100
    }
  },
  "board": {
    "maxTasks": 50,
    "archiveAfterHours": 1,
    "groomingInterval": 600,
    "analyst": {
      "enabled": true,
      "delay": 10,
      "model": "claude-3-sonnet-20240229"
    }
  },
  "memory": {
    "compressionThresholds": {
      "archives": 3,
      "memories": 5
    },
    "searchEnabled": true,
    "rebirthEnabled": true
  },
  "security": {
    "enabled": true,
    "approvalRequired": "high",
    "patterns": {
      "critical": ["rm\\s+-rf", "sudo\\s+", "DROP\\s+TABLE"],
      "high": ["git\\s+push.*--force", "npm\\s+publish"],
      "medium": ["curl.*POST", "wget.*-O"]
    }
  }
}
```

## Pi Daemon Configuration

### Environment Variables
**File:** `p10-pi-daemon/.env`

```bash
# AI Configuration
ANTHROPIC_API_KEY=sk-ant-api03-...  # Required: Anthropic API key
OPENAI_API_KEY=sk-proj-...          # Optional: OpenAI API key
DEFAULT_MODEL=claude-3-sonnet-20240229  # Default LLM model
MODEL_ROUTER_ENABLED=true           # Enable intelligent model selection
MAX_CONTEXT_TOKENS=100000          # Maximum context window size
MAX_OUTPUT_TOKENS=4000             # Maximum response length

# Mesh Configuration
MASTER_URL=ws://localhost:7777     # Master daemon WebSocket URL
DAEMON_ID=pi-daemon-1              # Unique daemon identifier
RECONNECT_INTERVAL=5000            # Reconnection delay (ms)
HEARTBEAT_INTERVAL=5000            # Heartbeat frequency (ms)

# Agent Configuration
DEFAULT_ROLE=planning_agent        # Default agent role
ROLE_SWITCHING_ENABLED=true        # Allow dynamic role changes
CONTEXT_MEMORY_SIZE=10             # Number of recent tasks to remember

# File System
PROJECT_ROOT=.                     # Project directory root
ALLOWED_PATHS=[".", "src", "docs"] # Allowed file paths
FORBIDDEN_PATHS=["node_modules", ".git", ".env"]  # Forbidden paths

# Performance
CONCURRENT_TASKS=3                 # Maximum concurrent task execution
TASK_TIMEOUT=1800                  # Task timeout (seconds)
RESPONSE_STREAMING=true            # Enable response streaming
```

### Model Router Configuration
**File:** `p10-pi-daemon/config/models.json`

```json
{
  "models": {
    "claude-3-haiku-20240307": {
      "provider": "anthropic",
      "contextWindow": 200000,
      "costPer1kTokens": 0.00025,
      "speed": "fast",
      "capabilities": ["chat", "code"]
    },
    "claude-3-sonnet-20240229": {
      "provider": "anthropic", 
      "contextWindow": 200000,
      "costPer1kTokens": 0.003,
      "speed": "medium",
      "capabilities": ["chat", "code", "reasoning"]
    },
    "claude-3-opus-20240229": {
      "provider": "anthropic",
      "contextWindow": 200000,
      "costPer1kTokens": 0.015,
      "speed": "slow",
      "capabilities": ["chat", "code", "reasoning", "complex"]
    }
  },
  "routing": {
    "simple": "claude-3-haiku-20240307",
    "complex": "claude-3-sonnet-20240229", 
    "critical": "claude-3-opus-20240229"
  },
  "patterns": {
    "simple": ["fix typo", "add comment", "format code"],
    "complex": ["build component", "implement feature", "debug issue"],
    "critical": ["architecture decision", "security implementation", "performance optimization"]
  }
}
```

### Agent Roles Configuration
**File:** `p10-pi-daemon/config/roles.json`

```json
{
  "roles": {
    "planning_agent": {
      "description": "Analyzes requirements and creates implementation plans",
      "systemPrompt": "You are a senior software architect...",
      "capabilities": ["analysis", "planning", "decomposition"],
      "preferredModel": "claude-3-sonnet-20240229"
    },
    "api_agent": {
      "description": "Builds backend APIs and server-side logic",
      "systemPrompt": "You are an expert backend developer...",
      "capabilities": ["api", "database", "server"],
      "preferredModel": "claude-3-sonnet-20240229"
    },
    "web_agent": {
      "description": "Creates frontend components and user interfaces",
      "systemPrompt": "You are a frontend specialist...",
      "capabilities": ["react", "ui", "styling"],
      "preferredModel": "claude-3-sonnet-20240229"
    },
    "review_agent": {
      "description": "Reviews code quality and finds bugs",
      "systemPrompt": "You are a code reviewer and QA specialist...",
      "capabilities": ["review", "testing", "debugging"],
      "preferredModel": "claude-3-opus-20240229"
    }
  }
}
```

## Web Application Configuration

### Environment Variables
**File:** `svelteapp/.env`

```bash
# Development Configuration
VITE_MASTER_URL=ws://localhost:7777    # Master daemon WebSocket URL
VITE_API_BASE=http://localhost:7777    # API base URL
VITE_DEV_PORT=3333                     # Development server port

# WebContainer Configuration
VITE_WEBCONTAINER_ENABLED=true        # Enable WebContainer sandbox
VITE_PREVIEW_PORT=3001                # WebContainer preview port
VITE_HOT_RELOAD=true                  # Enable hot reload
VITE_BUILD_MODE=development           # Build mode

# UI Configuration  
VITE_THEME=dark                       # Default theme (dark|light)
VITE_CHAT_HISTORY_SIZE=100           # Chat history retention
VITE_AUTO_SAVE=true                  # Auto-save settings
VITE_PANEL_LAYOUT=default            # Panel layout preset

# Feature Flags
VITE_MOBILE_PREVIEW=true             # Enable mobile preview panel
VITE_API_EXPLORER=true               # Enable API explorer
VITE_BOARD_VIEW=true                 # Enable board view
VITE_DEBUG_MODE=false                # Enable debug features
```

### Application Configuration
**File:** `svelteapp/src/config/app.json`

```json
{
  "ui": {
    "theme": {
      "default": "dark",
      "options": ["light", "dark", "auto"]
    },
    "layout": {
      "defaultPanels": ["chat", "web", "board"],
      "panelSizes": {
        "chat": 0.4,
        "preview": 0.6
      }
    },
    "chat": {
      "maxHistory": 100,
      "autoScroll": true,
      "timestampFormat": "HH:mm:ss"
    }
  },
  "webcontainer": {
    "autoStart": true,
    "defaultTemplate": "vite-react-ts",
    "previewDelay": 1000,
    "errorWatch": true
  },
  "features": {
    "mobilePreview": true,
    "apiExplorer": true,
    "boardView": true,
    "gitIntegration": false,
    "collaborationMode": false
  }
}
```

## Telegram Bot Configuration

### Environment Variables  
**File:** `p10-telegram/.env`

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...   # Bot token from @BotFather
BOT_USERNAME=your_p10_bot              # Bot username
WEBHOOK_URL=https://your-domain.com/webhook  # Webhook URL (production)

# User Management
ALLOWED_USERS=user1,user2,user3        # Comma-separated usernames
ADMIN_USERS=admin1,admin2              # Admin usernames
AUTHORIZATION_MODE=allowlist           # allowlist|open|admin_only

# Mesh Configuration
MASTER_URL=ws://localhost:7777         # Master daemon URL
DAEMON_ID=telegram-bot                 # Unique daemon ID
MESSAGE_TIMEOUT=30                     # Response timeout (seconds)

# Feature Configuration
GUIDED_TASK_CREATION=true             # Enable 3-step task flow
IMAGE_UPLOADS=true                    # Allow image uploads
FILE_UPLOADS=false                    # Allow file uploads
INLINE_KEYBOARD=true                  # Enable inline keyboards
```

### Bot Commands Configuration
**File:** `p10-telegram/config/commands.json`

```json
{
  "commands": [
    {
      "command": "start",
      "description": "Start the bot and show welcome message",
      "adminOnly": false
    },
    {
      "command": "status", 
      "description": "Get P10 system status",
      "adminOnly": false
    },
    {
      "command": "board",
      "description": "Show kanban board summary",
      "adminOnly": false
    },
    {
      "command": "add",
      "description": "Add task to board (guided flow)",
      "adminOnly": false
    },
    {
      "command": "task",
      "description": "Send coding task to Pi daemon",
      "adminOnly": false
    },
    {
      "command": "query",
      "description": "Query any daemon",
      "adminOnly": false
    },
    {
      "command": "debug",
      "description": "Get debug information",
      "adminOnly": true
    },
    {
      "command": "restart",
      "description": "Restart the system",
      "adminOnly": true
    }
  ],
  "features": {
    "guidedTaskCreation": {
      "enabled": true,
      "steps": ["title", "description", "priority"],
      "timeout": 300
    },
    "inlineKeyboards": {
      "taskPriority": ["🔵 Low", "🟡 Normal", "🟠 High", "🔴 Urgent"],
      "taskActions": ["✅ Complete", "❌ Cancel", "⏸️ Pause"]
    }
  }
}
```

## Security Configuration

### Security Policies
**File:** `config/security.json`

```json
{
  "riskClassification": {
    "critical": {
      "patterns": [
        "rm\\s+-rf",
        "sudo\\s+",
        "git\\s+push.*--force",
        "DROP\\s+TABLE",
        "DELETE\\s+FROM.*WHERE\\s+1=1"
      ],
      "action": "block_and_request_approval"
    },
    "high": {
      "patterns": [
        "npm\\s+publish",
        "docker\\s+push",
        "kubectl\\s+delete"
      ],
      "action": "request_approval"
    },
    "medium": {
      "patterns": [
        "curl.*-X\\s+POST",
        "wget.*-O",
        "chmod\\s+777"
      ],
      "action": "log_and_proceed"
    }
  },
  "approvalFlow": {
    "timeout": 300,
    "approvers": ["admin1", "admin2"],
    "requireMultiple": false,
    "showContext": true
  },
  "fileSystem": {
    "allowedExtensions": [".js", ".ts", ".json", ".md", ".css", ".html"],
    "forbiddenPaths": ["node_modules", ".git", ".env", "logs"],
    "maxFileSize": 10485760,
    "maxFilesPerTask": 50
  }
}
```

## Logging Configuration

### Log Configuration
**File:** `config/logging.json`

```json
{
  "level": "info",
  "format": "json",
  "outputs": [
    {
      "type": "file",
      "path": "/tmp/p10-{component}.log",
      "maxSize": "10MB",
      "maxFiles": 5
    },
    {
      "type": "console",
      "colorize": true,
      "timestamp": true
    }
  ],
  "categories": {
    "mesh": {
      "level": "debug",
      "components": ["registry", "router", "websocket"]
    },
    "tasks": {
      "level": "info", 
      "components": ["board", "pipeline", "memory"]
    },
    "security": {
      "level": "warn",
      "components": ["security", "approval"]
    }
  }
}
```

## Performance Tuning

### Memory Management
```bash
# Master Daemon
export MAX_MEMORY_MB=2048
export GARBAGE_COLLECTION_INTERVAL=60
export EVENT_BUFFER_SIZE=10000

# Pi Daemon  
export CONTEXT_CACHE_SIZE=100
export RESPONSE_BUFFER_SIZE=1048576
export MODEL_CACHE_TTL=3600
```

### Connection Tuning
```bash
# WebSocket Configuration
export WS_PING_INTERVAL=30000
export WS_PONG_TIMEOUT=5000
export WS_MAX_CONNECTIONS=100

# HTTP Configuration
export REQUEST_TIMEOUT=30000
export KEEP_ALIVE_TIMEOUT=5000
export MAX_REQUEST_SIZE=10485760
```

### Concurrency Limits
```bash
# Task Processing
export MAX_CONCURRENT_TASKS=5
export TASK_QUEUE_SIZE=100
export WORKER_POOL_SIZE=3

# Pipeline Execution
export MAX_CONCURRENT_PIPELINES=3
export PIPELINE_QUEUE_SIZE=20
```

## Environment-Specific Configuration

### Development
```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
SECURITY_ENABLED=false
HOT_RELOAD=true
AUTO_SAVE=true
```

### Production
```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=warn
SECURITY_ENABLED=true
RATE_LIMITING=true
MONITORING=true
```

### Testing
```bash
# .env.test
NODE_ENV=test
LOG_LEVEL=error
SECURITY_ENABLED=false
TEST_MODE=true
MOCK_APIs=true
```

## Configuration Validation

### Validation Script
```bash
# Validate all configuration files
npm run config:validate

# Check specific component
npm run config:validate:master
npm run config:validate:pi-daemon
npm run config:validate:web
npm run config:validate:telegram
```

### Health Checks
```bash
# Configuration health check
curl http://localhost:7777/health/config

# Component status
curl http://localhost:7777/status?include=config
```

## Backup and Migration

### Configuration Backup
```bash
# Create configuration backup
tar -czf p10-config-$(date +%Y%m%d).tar.gz \
  p10-master/.env \
  p10-master/config/ \
  p10-pi-daemon/.env \
  p10-pi-daemon/config/ \
  svelteapp/.env \
  p10-telegram/.env
```

### Migration Between Environments
```bash
# Export development config
npm run config:export --env=development

# Import to production
npm run config:import --env=production --file=dev-config.json
```

## Next Steps

- **[Development Setup](development.md)** - Setup for P10 development
- **[Troubleshooting](troubleshooting.md)** - Solve configuration issues
- **[Architecture Overview](../architecture/overview.md)** - Understand the system design
- **[API Reference](../api/rest-api.md)** - Integration and automation