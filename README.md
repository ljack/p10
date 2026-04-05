# P10 — AI-Powered Software Development Platform

> _"Spec it by day, ship it by night."_

P10 is a spec-driven, AI-powered development platform that orchestrates agents to build full-stack web applications. Chat with an AI agent, watch your app appear in real-time previews, and let the daemon mesh handle the rest.

## Quick Start

```bash
# Start everything (Master Daemon + Pi Daemon + Web App)
./start-mesh.sh

# Or just the web app (without daemon mesh)
cd svelteapp && npx vite dev --port 3333
```

Open http://localhost:3333, paste your Anthropic API key, and say "Build a todo app with API backend".

## Features

### 🤖 AI Agent
- Chat-based development with Claude
- Agent writes code, preview updates live
- Auto-detects and fixes build errors
- Spec-driven workflow (IDEA → PRD → FSD → PLAN → Code)

### 👁️ Multi-Preview
- **Web** — Live iframe with hot-reload
- **API** — Interactive endpoint explorer with auto-discovery
- **Mobile** — Draggable iPhone frame overlay

### 🔗 Daemon Mesh
Three interconnected daemons with heartbeat:
- **Master Daemon** (port 7777) — Registry, routing, security
- **Browser Daemon** — Monitors preview, detects errors
- **Pi Daemon** — Autonomous coding agent using pi SDK

### 📋 Spec-Driven Development
- Generate IDEA.md, PRD.md, FSD.md, PLAN.md from chat
- Approve specs before building
- Task tracking from PLAN.md checkboxes

### 🔍 Debug Observability
- `/tmp/p10-debug.log` — Event timeline
- `GET /api/debug` — State snapshot with TLDR
- `curl -N localhost:3333/api/debug/ws` — Real-time event stream

### 💬 Chat Commands
```
/help    — Show available commands
/mesh    — Daemon mesh status
/debug   — Debug snapshot
/task    — Send task to Pi Daemon
/query   — Query a daemon
/clear   — Clear chat
```

## Architecture

```
┌─────────────────────────────────────────────┐
│              P10 Daemon Mesh                │
│                                             │
│  Browser Daemon ◄──► Master ◄──► Pi Daemon  │
│  (in web app)       (port 7777)  (pi SDK)   │
│                                             │
│  WebContainer ──► Vite + React (port 5173)  │
│                ──► Express API (port 3001)   │
└─────────────────────────────────────────────┘
```

## Development

```bash
# Unit tests (37 tests, <200ms)
cd svelteapp && npm run test:unit

# E2E tests (17 tests, ~3min)
cd svelteapp && npm run test:e2e

# All tests
cd svelteapp && npm test

# Monitor
curl http://localhost:7777/status    # Mesh status
tail -f /tmp/p10-debug.log          # Debug events
```

## Tech Stack

- **Frontend:** SvelteKit, Svelte 5, Tailwind CSS v4
- **Sandbox:** WebContainers (in-browser Node.js)
- **AI:** Anthropic Claude via Vercel AI SDK
- **Daemons:** WebSocket mesh, Node.js
- **Testing:** Vitest + Playwright
