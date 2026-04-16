# P10 Documentation

Welcome to the P10 AI Daemon Mesh documentation. P10 is a distributed AI system where multiple AI agents coordinate through a WebSocket mesh to build, review, and ship software autonomously.

## Quick Navigation

### 📚 [Setup Guide](setup/README.md)
Get P10 running on your system, from basic installation to advanced configuration.

### 🏗️ [Architecture](architecture/README.md)
Learn how P10's mesh architecture works, component interactions, and system design.

### 🔌 [API Reference](api/README.md)
Complete reference for REST APIs, WebSocket messages, mesh tools, and integrations.

## What is P10?

P10 is a **spec-driven, AI-powered software development platform** that orchestrates specialized agents to build complete applications from natural language specifications. It combines:

- **Multi-agent orchestration** for complex software projects
- **pi-coding-agent** as the proven coding agent foundation
- **Real-time preview** with live development feedback
- **Progressive knowledge compression** for long-term project memory

## Key Features

- 🤖 **Multi-Agent Coordination**: Specialized agents for planning, API development, web development, and code review
- 🔄 **Pipeline System**: Complex tasks decomposed into role-based sequences
- 📋 **Kanban Board**: Visual task management with AI-powered analysis
- 🧠 **Progressive Memory**: Four-tier knowledge compression system
- 🌐 **Live Preview**: In-browser Node.js sandbox with instant feedback
- 💬 **Multiple Interfaces**: Browser chat, Telegram bot, CLI tools
- 🔒 **Security**: Built-in safety checks for destructive operations

## Getting Started

1. **[Quick Start](setup/quick-start.md)** - Get running in 5 minutes
2. **[Architecture Overview](architecture/overview.md)** - Understand the system
3. **[API Basics](api/rest-api.md)** - Start building with P10

## System Status

```bash
# Check if P10 is running
curl http://localhost:7777/health

# Get full system status
curl http://localhost:7777/status
```

---

*"Spec it by day, ship it by night."*