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

### 3. Pipelines - Multi-Agent Orchestration

P10's **pipeline system** decomposes complex instructions into role-based task sequences that execute automatically:

```bash
# Launch a pipeline
curl -X POST http://localhost:7777/pipeline \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Build authentication with login and registration"}'

# Or via pi CLI
/pipeline "Build auth"
```

**Pipeline Flow:**
1. **Decomposition**: LLM breaks instruction into role-specific tasks
2. **Dependency resolution**: Smart ordering (planning → api → web → review)
3. **Sequential execution**: Each task gets prior context from completed tasks
4. **Error recovery**: Failed tasks trigger review_agent for fixes
5. **Board integration**: Pipeline creates a board task with live subtask progress

**Example Pipeline:**
```
Instruction: "Build auth"
├── [api_agent] Create auth endpoints: POST /api/auth/register, /api/auth/login
├── [api_agent] Add JWT middleware for protected routes  
├── [web_agent] Create login form with email/password
├── [web_agent] Create registration form
├── [web_agent] Add protected route wrapper
└── [review_agent] Verify the complete auth flow
```

**Pipeline Commands:**
- `mesh_pipeline "instruction"` - Launch new pipeline
- `mesh_pipeline_status [pipelineId]` - Check progress
- `mesh_pipeline_cancel <pipelineId>` - Cancel running pipeline  
- `mesh_pipeline_rerun <pipelineId>` - Retry failed pipeline from first incomplete task

**REST API:**
```bash
# Launch pipeline
POST /pipeline
{
  "instruction": "Build auth with 'secure' tokens & validation",
  "channel": "rest-api"
}

# Check status  
GET /pipeline/:id
GET /pipelines  # all active/recent

# Control
POST /pipeline/:id/cancel
POST /pipeline/:id/rerun
```

**Pipeline Lifecycle:**
```
planning → executing → completed/failed
    │
    └── tasks: pending → active → completed/failed/skipped
```

### How to Use Pipelines

**1. Via Browser Chat:**
```
/pipeline "Build todo app with auth"
```

**2. Via Pi CLI with P10 Extension:**
```bash
pi
> mesh_pipeline "Build user authentication"
> mesh_pipeline_status
> mesh_pipeline_status pipeline-abc123
```

**3. Via REST API:**
```bash
# Simple pipeline
curl -X POST http://localhost:7777/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Build REST API for blog posts"
  }'

# Complex pipeline with context
curl -X POST http://localhost:7777/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Add real-time notifications",
    "context": "Use WebSocket, integrate with existing auth"
  }'
```

**4. Via Telegram:**
```
/task Build e-commerce cart with checkout
```

**Pipeline Types:**

| Approach | When Used | Example |
|----------|-----------|----------|
| **Direct** | Simple 1-task instructions | "Fix the login bug" |
| **LLM Decomposed** | Complex multi-step work | "Build auth system" |
| **Plan-driven** | Uses unchecked PLAN.md items | "Build everything in PLAN.md" |

**Error Recovery:**
- Failed tasks automatically trigger `review_agent`
- Review agent analyzes error and attempts fix
- If recovery succeeds, pipeline continues
- If recovery fails, pipeline fails (can be re-run)

## Pipeline vs Autonomous Run

**The Key Distinction:**

- **Pipeline**: "Build this one feature" → Multi-agent coordination for a single objective
- **Autonomous Run**: "Build everything" → Multi-pipeline orchestration for entire project

### Pipeline: Tactical Execution
```bash
# Single feature request
mesh_pipeline "Build user authentication"

# Result: 1 pipeline with 4-6 coordinated tasks
├── [planning_agent] Design auth flow
├── [api_agent] Create auth endpoints  
├── [web_agent] Build login/register forms
└── [review_agent] Test complete auth system
```

### Autonomous Run: Strategic Execution  
```bash
# Project-wide execution
mesh_run "Build everything in PLAN.md"

# Result: Multiple pipelines running sequentially
Run #1: Processing 12 unchecked PLAN.md items...
├── Pipeline A: "User Management" (5 tasks)
├── Pipeline B: "Payment Integration" (7 tasks)  
├── Pipeline C: "Admin Dashboard" (4 tasks)
└── Pipeline D: "Email Notifications" (3 tasks)

# Runs overnight, generates morning report
```

### When to Use Each

| Scenario | Use | Why |
|----------|-----|-----|
| "Add login functionality" | Pipeline | Single feature, needs coordination |
| "Fix the broken navbar" | Task | Simple fix, no coordination needed |
| "Ship v2.0 by morning" | Autonomous Run | Multiple features, strategic scope |
| "What's our test coverage?" | Query | Just need information |

**Think of it as:**
- Pipeline = "Build this house" (architect → foundation → framing → roofing)
- Autonomous Run = "Build this entire neighborhood" (multiple houses, each with their own pipeline)

## All Execution Modes in P10

P10 offers several ways to execute work, each optimized for different scenarios:

### Pipeline vs Task vs Run vs Query

| Mode | When to Use | Example | Execution |
|------|-------------|---------|----------|
| **Pipeline** | Multi-step features requiring coordination | "Build auth system" | Decomposed into role-specific tasks, executed sequentially with context handoffs |
| **Individual Task** | Single-purpose work, quick fixes | "Fix the login bug" | Sent directly to any available Pi Daemon, no decomposition |
| **Autonomous Run** | Overnight batch processing | "Build everything in PLAN.md" | Reads unchecked PLAN.md items, creates pipelines for each, executes all |
| **Board Task** | Manual planning, tracking ideas | "Add dark mode" | Human-created, stays on kanban board until picked up |
| **Query** | Information requests, debugging | "What's the API structure?" | Immediate response from best-suited daemon (browser/pi) |

### Detailed Comparison

**🔄 Pipeline**
- **Scope**: Multi-agent, role-based (planning → api → web → review)
- **Intelligence**: LLM decomposes instruction into optimal task sequence
- **Context**: Each task receives results from prior tasks
- **Recovery**: Failed tasks trigger review_agent for automatic fixes
- **Board**: Creates umbrella task with live subtask progress
- **Use case**: "Build user registration with email verification"

**📋 Individual Task** 
- **Scope**: Single agent, any role
- **Intelligence**: Instruction executed as-is
- **Context**: Optional context parameter, no structured handoffs
- **Recovery**: Manual retry if failed
- **Board**: Creates single task entry
- **Use case**: "Add error handling to the login endpoint"

**🌙 Autonomous Run**
- **Scope**: Multi-pipeline, project-wide
- **Intelligence**: Processes PLAN.md, creates pipelines for unchecked items
- **Context**: Long-term project knowledge, morning reports
- **Recovery**: Failed pipelines can be individually retried
- **Board**: Creates run tracker + individual pipeline tasks
- **Use case**: "Ship the entire feature roadmap overnight"

**📌 Board Task**
- **Scope**: Planning and tracking
- **Intelligence**: Human-created, AI-analyzed after 10s
- **Context**: Task analyst enriches with questions, dependencies, tags
- **Recovery**: Manual task management
- **Board**: Core kanban workflow (planned → in-progress → done)
- **Use case**: "Research GraphQL vs REST for our API"

**❓ Query**
- **Scope**: Information gathering
- **Intelligence**: Smart routing (browser for state, pi for code analysis)
- **Context**: 15s timeout, immediate response
- **Recovery**: N/A (stateless)
- **Board**: No task created
- **Use case**: "How many API routes do we have?"

### When to Use What?

```
Need info? ──────────────→ Query
   │
   ▼
Quick fix? ──────────────→ Individual Task  
   │
   ▼
Multi-step feature? ────→ Pipeline
   │
   ▼
Overnight batch work? ──→ Autonomous Run
   │
   ▼
Just planning? ──────────→ Board Task
```

### API Comparison

```bash
# Query (immediate)
curl "http://localhost:7777/query" -d '{"question": "API status?"}'

# Task (single agent)
curl "http://localhost:7777/task" -d '{"instruction": "Fix login bug"}'

# Pipeline (multi-agent)
curl "http://localhost:7777/pipeline" -d '{"instruction": "Build auth"}'

# Run (batch mode)
curl "http://localhost:7777/runs/start" -d '{"instruction": "Build everything"}'

# Board task (manual)
curl "http://localhost:7777/board/task" -d '{"title": "Research tech"}'
```

### Detailed Comparison

**🔄 Pipeline**
- **Scope**: Multi-agent, role-based (planning → api → web → review)
- **Intelligence**: LLM decomposes instruction into optimal task sequence
- **Context**: Each task receives results from prior tasks
- **Recovery**: Failed tasks trigger review_agent for automatic fixes
- **Board**: Creates umbrella task with live subtask progress
- **Use case**: "Build user registration with email verification"

**📋 Individual Task** 
- **Scope**: Single agent, any role
- **Intelligence**: Instruction executed as-is
- **Context**: Optional context parameter, no structured handoffs
- **Recovery**: Manual retry if failed
- **Board**: Creates single task entry
- **Use case**: "Add error handling to the login endpoint"

**🌙 Autonomous Run**
- **Scope**: Multi-pipeline, project-wide
- **Intelligence**: Processes PLAN.md, creates pipelines for unchecked items
- **Context**: Long-term project knowledge, morning reports
- **Recovery**: Failed pipelines can be individually retried
- **Board**: Creates run tracker + individual pipeline tasks
- **Use case**: "Ship the entire feature roadmap overnight"

**📌 Board Task**
- **Scope**: Planning and tracking
- **Intelligence**: Human-created, AI-analyzed after 10s
- **Context**: Task analyst enriches with questions, dependencies, tags
- **Recovery**: Manual task management
- **Board**: Core kanban workflow (planned → in-progress → done)
- **Use case**: "Research GraphQL vs REST for our API"

**❓ Query**
- **Scope**: Information gathering
- **Intelligence**: Smart routing (browser for state, pi for code analysis)
- **Context**: 15s timeout, immediate response
- **Recovery**: N/A (stateless)
- **Board**: No task created
- **Use case**: "How many API routes do we have?"

### When to Use What?

```
Need info? ──────────────→ Query
   │
   ▼
Quick fix? ──────────────→ Individual Task  
   │
   ▼
Multi-step feature? ─────→ Pipeline
   │
   ▼
Overnight batch work? ───→ Autonomous Run
   │
   ▼
Just planning? ──────────→ Board Task
```

### API Comparison

```bash
# Query (immediate)
curl "http://localhost:7777/query" -d '{"question": "API status?"}'

# Task (single agent)
curl "http://localhost:7777/task" -d '{"instruction": "Fix login bug"}'

# Pipeline (multi-agent)
curl "http://localhost:7777/pipeline" -d '{"instruction": "Build auth"}'

# Run (batch mode)
curl "http://localhost:7777/runs/start" -d '{"instruction": "Build everything"}'

# Board task (manual)
curl "http://localhost:7777/board/task" -d '{"title": "Research tech"}'
```

### 4. Results appear live

The **Browser Daemon** monitors the WebContainer — a full Node.js environment running in-browser. Changes trigger hot-reload. Errors are auto-detected and sent back to agents for fixing.

### 5. Knowledge compounds

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
