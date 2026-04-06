# P10 — AI Daemon Mesh for Software Development

> Multiple AI agents coordinate through a WebSocket mesh to build, review, and ship software autonomously. You chat, they code.

```
    You ───► Chat / Telegram / CLI
               │
    ┌──────────▼──────────────────────────────────────────┐
    │              P10 DAEMON MESH (WebSocket)             │
    │                                                      │
    │  ┌─────────┐   ┌──────────┐   ┌──────────────────┐  │
    │  │ Browser  │◄─►│  Master  │◄─►│   Pi Daemon      │  │
    │  │ Daemon   │   │  :7777   │   │   (AI Agent)     │  │
    │  │          │   │          │   │                   │  │
    │  │ Preview  │   │ Registry │   │ Claude + pi SDK   │  │
    │  │ Errors   │   │ Router   │   │ Code read/write  │  │
    │  │ API      │   │ Security │   │ Multi-role       │  │
    │  └─────────┘   │ Events   │   └──────────────────┘  │
    │                 │ Board    │   ┌──────────────────┐  │
    │                 │ Memory   │◄─►│  Telegram Bot    │  │
    │                 │ Runs     │   └──────────────────┘  │
    │                 │ Analyst  │   ┌──────────────────┐  │
    │                 │ Grooming │◄─►│  Pi CLI ×N       │  │
    │                 └──────────┘   └──────────────────┘  │
    └──────────────────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  WebContainer        │
    │  (in-browser Node.js)│
    │  ├── Vite + React    │
    │  └── Express API     │
    └─────────────────────┘
```

## Quick Start

```bash
./start-mesh.sh          # Start everything (Master + Pi Daemon + Web App)
open http://localhost:3333   # Paste your Anthropic API key, start building
```

Or just the web app without the daemon mesh:
```bash
cd svelteapp && npx vite dev --port 3333
```

---

## How It Works

### 1. You describe what to build

Via browser chat, Telegram, or pi CLI. Tasks flow into the **Kanban Board**.

### 2. AI agents pick up work

The **Pi Daemon** (powered by Claude via [pi SDK](https://github.com/nicholasgasior/pi-coding-agent)) reads, writes, and executes code in your project. It can operate in specialized roles:

| Role | Focus |
|---|---|
| `planning_agent` | Break requirements into tasks |
| `api_agent` | Build Express endpoints, data models |
| `web_agent` | Build React components, pages, styling |
| `review_agent` | Review code, find bugs, suggest fixes |

### 3. Results appear live

The **Browser Daemon** monitors the WebContainer — a full Node.js environment running in-browser. Changes trigger hot-reload. Errors are auto-detected and sent back to agents for fixing.

### 4. Knowledge compounds

Completed tasks flow through **progressive memory compression**:

```
Active Board (≤30 tasks)  →  Archive (full data, 7 days)
    →  Memory (AI summaries)  →  Reflections (project knowledge)
```

New tasks are auto-enriched by the **Task Analyst** with questions, ideas, dependencies, and tags — informed by past work.

---

## Architecture

### The Mesh

All communication flows through the **Master Daemon** (port 7777) via WebSocket. Every participant registers, heartbeats every 5s, and gets a status (alive/stale/dead).

```
Message format: { id, from, to, type, payload, timestamp }
Routing:  to="*" → smart route (tasks→pi, queries→browser)
          to="master" → handled by master
          to="daemon-id" → point-to-point
```

**23 message types**: register, heartbeat, task, task_result, query, query_response, pipeline_progress, state_snapshot, mesh_event, approval_request, and more.

**Security gate**: Tasks are checked against regex patterns before routing. Destructive operations (`rm -rf`, `sudo`, `DROP TABLE`, `git push --force`) are blocked and require approval.

### Components

#### Master Daemon (`p10-master/`) — The Brain
| Module | Purpose |
|---|---|
| `registry.ts` | Daemon registration, heartbeat monitoring, status tracking |
| `router.ts` | Smart message routing with security checks |
| `eventBus.ts` | Pub/sub event system with glob pattern subscriptions |
| `taskBoard.ts` | Kanban board (planned/in-progress/done/failed/blocked) |
| `taskAnalyst.ts` | Auto-enriches human tasks after 10s with AI analysis |
| `boardMemory.ts` | 4-tier knowledge tree (archive → memory → reflection) |
| `groomingAgent.ts` | Manages board size, compresses old tasks into memories |
| `planSync.ts` | Bidirectional PLAN.md ↔ board sync |
| `pipelineExecutor.ts` | Multi-step pipeline orchestration with role switching |
| `autonomousRun.ts` | Fire-and-forget runs: reads PLAN.md, executes all tasks overnight |
| `decomposer.ts` | Breaks instructions into role-based pipeline tasks |
| `security.ts` | Regex-based risk classification (low/medium/high/critical) |
| `messageTracker.ts` | Tracks task origins for bidirectional result routing |
| `integrations.ts` | Telegram setup and user management |

#### Pi Daemon (`p10-pi-daemon/`) — The Hands
- Full [pi SDK](https://github.com/nicholasgasior/pi-coding-agent) agent session with Claude
- Reads/writes/executes code in the project directory
- **Model router**: selects best model based on task complexity
- **Role system**: switches persona per task (api_agent, web_agent, etc.)
- Security checks on both daemon and master side

#### Browser Daemon (`svelteapp/`) — The Eyes
- Runs inside the SvelteKit web app (browser-side WebSocket)
- Monitors WebContainer: server status, build errors, API routes
- **Autonomous error watch**: detects errors, auto-requests fixes from Pi Daemon (max 3 attempts)
- Provides state snapshots to the mesh
- Live preview with Web, API Explorer, Mobile, and Board tabs

#### Telegram Bot (`p10-telegram/`) — The Phone
- Bridges Telegram ↔ mesh with bidirectional result routing
- Commands: `/status`, `/board`, `/add`, `/task`, `/query`, `/debug`
- Guided task creation flow (3-step: title → description → priority)
- User authorization via allowlist

#### Pi CLI Extensions (`.pi/extensions/`) — The Glue
19 custom tools connecting pi CLI sessions to the mesh:

| Tool | Purpose |
|---|---|
| `mesh_status` | Daemon health overview |
| `mesh_task` / `mesh_query` | Send tasks or queries to mesh |
| `mesh_board` / `mesh_add_task` | Kanban board read/write |
| `mesh_pipeline` | Launch multi-agent pipelines |
| `mesh_run` | Start autonomous PLAN.md runs |
| `mesh_events` / `emit_mesh_event` | Event bus access |
| `mesh_debug` | Browser app state snapshot |

Slash commands: `/mesh`, `/board`, `/p10`

### Task Lifecycle

```
Human types "add auth"     Agent decides task needed
       │                          │
       ▼                          ▼
  ┌─────────┐              ┌─────────┐
  │ PLANNED  │              │ PLANNED  │
  │ human=✓  │              │ human=✗  │
  └────┬─────┘              └────┬─────┘
       │ 10s                     │
       ▼                         │
  ┌──────────┐                   │
  │ ANALYST  │ rewrite title     │
  │ 🔍       │ add questions     │
  │          │ find deps         │
  │          │ suggest tags      │
  └────┬─────┘                   │
       │                         │
       ▼                         ▼
  ┌─────────────┐          ┌─────────────┐
  │ IN PROGRESS │          │ IN PROGRESS │
  │ → Pi Daemon │          │ → Pi Daemon │
  └──────┬──────┘          └──────┬──────┘
         │                        │
    ┌────┴────┐              ┌────┴────┐
    ▼         ▼              ▼         ▼
 ┌──────┐ ┌────────┐     ┌──────┐ ┌────────┐
 │ DONE │ │ FAILED │     │ DONE │ │ FAILED │
 └──┬───┘ └────────┘     └──┬───┘ └────────┘
    │  30 min                │
    ▼                        ▼
 ┌─────────┐           ┌─────────┐
 │ ARCHIVE │           │ ARCHIVE │
 └────┬────┘           └─────────┘
      │  3+ related
      ▼
 ┌──────────┐
 │ MEMORY   │  AI-summarized group
 └────┬─────┘
      │  5+ related
      ▼
 ┌────────────┐
 │ REFLECTION │  high-level project knowledge
 └────────────┘
```

### Board Memory — Progressive Knowledge Compression

The board never gets overwhelming. Old tasks compress through 4 tiers, each maintaining a path back to the source:

| Tier | Contents | Lifespan | Navigation |
|---|---|---|---|
| **Active Board** | Full tasks, ≤30 | Current | Direct |
| **Archive** | Full task data | 7 days | `GET /board/memory/:id` |
| **Memory** | AI summary of 3+ archives | Indefinite | Drill down to archives |
| **Reflection** | Distilled insights from 5+ memories | Permanent | Drill down to memories |

**Rebirth**: Any archived knowledge can be recreated as a new planned task via `POST /board/memory/rebirth/:id`.

**Context injection**: When the Task Analyst enriches new tasks, it searches memories for relevant past work and includes it in the analysis prompt.

---

## REST API (Master Daemon :7777)

### System
| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check |
| `/status` | GET | All daemons + system TLDR |
| `/restart` | POST | Graceful self-restart |

### Tasks & Queries
| Endpoint | Method | Purpose |
|---|---|---|
| `/task` | POST | Submit a task (auto-routed to Pi Daemon) |
| `/query` | POST | Query a daemon (15s timeout) |
| `/message` | POST | Raw message routing |
| `/messages` | GET | Message history |

### Board
| Endpoint | Method | Purpose |
|---|---|---|
| `/board` | GET | Full kanban board |
| `/board/task` | POST | Add task |
| `/board/task/:id` | PATCH | Move/update task |
| `/board/task/:id` | DELETE | Remove task |
| `/board/sync` | GET/POST | PLAN.md sync status / trigger |

### Memory
| Endpoint | Method | Purpose |
|---|---|---|
| `/board/memory` | GET | All memory tiers |
| `/board/memory/:id` | GET | Node + children + path |
| `/board/memory/search?q=` | GET | Search all tiers |
| `/board/memory/reflections` | GET | Top-level knowledge |
| `/board/memory/rebirth/:id` | POST | Recreate task from memory |
| `/board/grooming` | GET | Grooming agent status |
| `/board/groom` | POST | Force grooming cycle |

### Pipelines & Runs
| Endpoint | Method | Purpose |
|---|---|---|
| `/pipeline` | POST | Launch multi-agent pipeline |
| `/pipeline/:id` | GET | Pipeline status |
| `/pipelines` | GET | All active/recent pipelines |
| `/runs` | GET | Autonomous run history |
| `/runs/start` | POST | Start a PLAN.md run |
| `/runs/:id` | GET | Run status |
| `/runs/:id/pause` | POST | Pause run |
| `/runs/:id/resume` | POST | Resume run |

### Events
| Endpoint | Method | Purpose |
|---|---|---|
| `/events` | GET | Event bus history |
| `/events/emit` | POST | Emit event |
| `/events/subscribe` | POST | Subscribe to pattern |

---

## Chat Commands (Browser)

```
/help    — Available commands
/add     — Add task to board
/board   — Board summary
/task    — Send task to Pi Daemon
/query   — Query a daemon
/mesh    — Mesh status
/status  — Full system status
/debug   — Debug snapshot
/clear   — Clear chat
```

## Telegram Commands

```
/start    — Welcome + command list
/status   — Mesh status
/board    — Kanban board
/add      — Guided task creation (3-step flow)
/task     — Send coding task
/query    — Query daemons
/debug    — Debug snapshot
/register — Register your Telegram user
```

---

## Development

```bash
# Start full mesh
./start-mesh.sh

# Stop all daemons
./stop-mesh.sh

# Restart just the master (daemons auto-reconnect)
curl -X POST http://localhost:7777/restart

# Monitor
tail -f /tmp/p10-master.log     # Master daemon
tail -f /tmp/p10-pi.log         # Pi daemon
tail -f /tmp/p10-debug.log      # Debug events
curl localhost:7777/status       # Mesh status
curl localhost:7777/board        # Task board

# Tests
cd svelteapp && npm run test:unit   # Unit tests
cd svelteapp && npm run test:e2e    # E2E tests (Playwright)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit, Svelte 5, Tailwind CSS v4 |
| Sandbox | WebContainers (in-browser Node.js) |
| AI | Anthropic Claude via Vercel AI SDK + pi SDK |
| Mesh | WebSocket (ws), Node.js, TypeScript |
| Bot | node-telegram-bot-api |
| Testing | Vitest + Playwright |
| Version Control | isomorphic-git (in-browser) |

## Project Structure

```
p10/
├── p10-master/src/          # Master Daemon (18 modules, 4800 LOC)
│   ├── index.ts             # HTTP + WebSocket server, REST API
│   ├── registry.ts          # Daemon registration + heartbeat
│   ├── router.ts            # Smart message routing + security
│   ├── taskBoard.ts         # Kanban board with AI analyst
│   ├── boardMemory.ts       # Progressive knowledge compression
│   ├── groomingAgent.ts     # Backlog management
│   ├── autonomousRun.ts     # Fire-and-forget PLAN.md execution
│   ├── pipelineExecutor.ts  # Multi-agent pipeline orchestration
│   └── ...                  # eventBus, planSync, decomposer, etc.
├── p10-pi-daemon/src/       # Pi Daemon (4 modules)
│   ├── index.ts             # Agent session, task/query handling
│   ├── roles.ts             # Role-specific prompts (api/web/review)
│   ├── modelRouter.ts       # Model selection by task type
│   └── wsClient.ts          # WebSocket client
├── p10-telegram/src/        # Telegram Bot (2 modules)
├── svelteapp/src/           # Web App + Browser Daemon
│   ├── lib/daemon/          # Browser daemon + autonomous agent
│   ├── lib/components/      # Chat, Preview, Board, API panels
│   ├── lib/sandbox/         # WebContainer management
│   └── routes/api/          # SvelteKit API proxies
├── .pi/extensions/          # Pi CLI mesh integration (19 tools)
├── docs/                    # Architecture plans
├── start-mesh.sh            # Launch script
└── PLAN.md                  # Implementation plan (syncs with board)
```

## Stats

- **~11,700 lines** of TypeScript/Svelte across 50+ source files
- **72 commits** of iterative development
- **5 daemon types**: master, browser, pi, telegram, pi-cli
- **19 mesh tools** available to AI agents
- **23 message types** in the WebSocket protocol
- **4-tier memory system** with progressive compression

---

*"Spec it by day, ship it by night."*
