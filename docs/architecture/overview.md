# Architecture Overview

P10 implements a **distributed agent mesh** architecture where specialized AI agents coordinate through WebSocket communication to build software collaboratively.

## Design Philosophy

### Harness of Harnesses
P10 is not a single coding agent—it's an **orchestrator** that manages multiple specialized agents working on a shared codebase. Each agent has focused context and responsibility.

### 24-Hour Development Loop
```
☀️ DAYTIME (Interactive)          🌙 NIGHTTIME (Autonomous)
┌─────────────────────────────┐  ┌──────────────────────────┐
│ Human + Agent collaborate:  │  │ Agents run solo:         │
│ • Explore ideas (MVPs/POCs) │  │ • Code from specs        │
│ • Short sprints & checks    │  │ • Test against specs     │
│ • Refine requirements       │  │ • Results by morning     │
│ • Capture guardrails        │  │                          │
│ • Prepare autonomous run    │  │                          │
└─────────────────────────────┘  └──────────────────────────┘
          ◄──── Markdown docs are the contract ────►
```

## System Components

### Master Daemon (The Brain)
**Port:** 7777  
**Purpose:** Central coordination hub

| Module | Responsibility |
|--------|----------------|
| `registry.ts` | Daemon registration, heartbeat monitoring |
| `router.ts` | Smart message routing with security |
| `taskBoard.ts` | Kanban board management |
| `taskAnalyst.ts` | AI-powered task enrichment |
| `boardMemory.ts` | Progressive knowledge compression |
| `groomingAgent.ts` | Board maintenance and cleanup |
| `pipelineExecutor.ts` | Multi-agent orchestration |
| `autonomousRun.ts` | Fire-and-forget overnight runs |
| `security.ts` | Risk assessment and approval gates |

**Key Features:**
- 23 WebSocket message types
- Smart routing (`to="*"` → auto-route to best daemon)
- Security gates for destructive operations
- 4-tier progressive memory system
- Pipeline decomposition with LLM

### Pi Daemon (The Hands)
**Purpose:** AI-powered coding execution

**Core Capabilities:**
- Full [pi SDK](https://github.com/nicholasgasior/pi-coding-agent) integration
- File read/write/execution in project directory
- Dynamic model routing based on task complexity
- Role-based persona switching

**Agent Roles:**
| Role | Focus | Typical Tasks |
|------|-------|---------------|
| `planning_agent` | Requirements analysis | Break down specs, identify dependencies |
| `api_agent` | Backend development | Express endpoints, data models, database |
| `web_agent` | Frontend development | React components, styling, user flows |
| `review_agent` | Quality assurance | Code review, bug fixes, testing |

**Model Router:**
- **Simple tasks** → Claude Haiku (fast, cost-effective)
- **Complex tasks** → Claude Sonnet (higher reasoning)
- **Critical tasks** → Claude Opus (maximum capability)

### Browser Daemon (The Eyes)
**Environment:** In-browser WebSocket client  
**Purpose:** Real-time development feedback

**Monitoring Capabilities:**
- WebContainer server status
- Build errors and warnings
- API endpoint discovery
- Performance metrics
- Error patterns

**Autonomous Error Watch:**
- Detects errors automatically
- Requests fixes from Pi Daemon
- Maximum 3 fix attempts per error
- Learns from successful fixes

**State Snapshots:**
```json
{
  "container": "running",
  "api": {
    "endpoints": ["/api/todos", "/api/auth"],
    "errors": []
  },
  "build": {
    "status": "success",
    "warnings": 2
  },
  "preview": "http://localhost:3001"
}
```

### Telegram Bot (The Phone)
**Platform:** Telegram Bot API  
**Purpose:** Mobile and remote access

**Commands:**
- `/status` - Mesh health overview
- `/board` - Current task board
- `/add` - Guided task creation flow
- `/task` - Direct task assignment
- `/query` - Query any daemon
- `/debug` - System debug snapshot

**User Management:**
- Authorization via user allowlist
- Role-based permissions
- Bidirectional result routing

### Pi CLI Extensions (The Glue)
**Location:** `.pi/extensions/`  
**Purpose:** Direct CLI access to mesh

**19 Custom Tools:**
| Tool | Purpose |
|------|---------|
| `mesh_status` | Daemon health overview |
| `mesh_task` / `mesh_query` | Send tasks/queries |
| `mesh_board` / `mesh_add_task` | Board management |
| `mesh_pipeline` | Multi-agent pipelines |
| `mesh_run` | Autonomous overnight runs |
| `mesh_events` | Event bus access |
| `mesh_debug` | System diagnostics |

## Communication Architecture

### WebSocket Mesh Protocol
All communication flows through the Master Daemon via WebSocket.

**Message Format:**
```json
{
  "id": "msg-uuid",
  "from": "daemon-id",
  "to": "target-daemon-id", // "*" for smart routing
  "type": "task|query|pipeline_progress|...",
  "payload": { /* type-specific data */ },
  "timestamp": "2026-04-07T12:00:00Z"
}
```

**Routing Rules:**
- `to="*"` → Smart route (tasks→pi, queries→browser)
- `to="master"` → Handled by master
- `to="daemon-id"` → Direct point-to-point
- `to="broadcast"` → All connected daemons

**Heartbeat System:**
- Every daemon heartbeats every 5 seconds
- Status: `alive` (recent), `stale` (old), `dead` (timeout)
- Auto-reconnection on network issues

### Security Model

**Risk Classification:**
- **Low**: File reads, status queries, board operations
- **Medium**: File writes, process execution
- **High**: System commands, network operations
- **Critical**: `rm -rf`, `sudo`, `git push --force`, database drops

**Approval Gates:**
```
Critical risk operation detected
├── Block automatically
├── Request human approval
├── Show command + context
└── Await confirmation
```

**Regex Patterns:**
```javascript
const CRITICAL_PATTERNS = [
  /rm\s+-rf/,
  /sudo\s+/,
  /git\s+push\s+.*--force/,
  /DROP\s+TABLE/,
  /DELETE\s+FROM.*WHERE\s+1=1/
];
```

## Task Management Architecture

### Task Lifecycle
```
Human Input → PLANNED → (Analyst) → IN PROGRESS → DONE/FAILED
                ↓                        ↓
            Enrichment              Pi Daemon
            (10s delay)              Execution
```

### Progressive Memory System
```
Active Board (≤30 tasks)  →  Archive (7 days, full data)
    →  Memory (AI summaries)  →  Reflections (project insights)
```

**Memory Compression:**
1. **Archive** (7 days): Full task data + results
2. **Memory**: AI-generated summaries of 3+ related archives
3. **Reflection**: Distilled project knowledge from 5+ memories

**Context Injection:**
- New tasks search memories for relevant context
- Task Analyst includes historical insights
- Prevents reinventing solved problems

## Pipeline System

### Multi-Agent Orchestration
Complex instructions are automatically decomposed into role-specific task sequences.

**Pipeline Example:**
```
Input: "Build authentication system"

Decomposed Tasks:
├── [planning_agent] Analyze auth requirements
├── [api_agent] Create auth endpoints (register, login, logout)
├── [api_agent] Add JWT middleware for protected routes
├── [web_agent] Build login/register forms
├── [web_agent] Add auth state management
└── [review_agent] Test complete auth flow
```

**Execution Flow:**
1. **LLM Decomposition** - Break instruction into subtasks
2. **Dependency Analysis** - Order tasks by dependencies
3. **Context Handoffs** - Each task receives prior results
4. **Error Recovery** - Failed tasks trigger review_agent
5. **Progress Tracking** - Real-time status updates

### Autonomous Runs

**PLAN.md Integration:**
- Reads unchecked tasks from PLAN.md
- Creates pipelines for each task
- Executes overnight without human intervention
- Generates morning reports with results

**Run Lifecycle:**
```
Start Run → Parse PLAN.md → Create Pipelines → Execute → Generate Report
```

## Development Environment

### WebContainer Sandbox
**Technology:** @webcontainer/api (in-browser Node.js)

**Capabilities:**
- Full Node.js runtime in browser
- File system API (read/write)
- Process API (run commands, stream output)
- Network API (serve web apps)

**Limitations:**
- Node.js only (no Python/Go in MVP)
- No native binaries
- Browser-dependent features
- Memory constraints

**Project Structure:**
```
WebContainer/
├── package.json     # Auto-generated dependencies
├── src/
│   ├── api/        # Express backend
│   └── components/ # React frontend
├── public/         # Static assets
└── vite.config.js  # Build configuration
```

## Scalability Considerations

### Horizontal Scaling
- Multiple Pi daemons can run simultaneously
- Load balancing via task queue in Master
- Regional Master daemons for global teams

### Vertical Scaling
- Individual daemons scaled with hardware
- Model routing optimizes compute usage
- Memory system reduces context window pressure

### Performance Optimizations
- Message batching for high-frequency updates
- Selective daemon awakening based on task type
- Caching of common LLM responses

## Reliability & Monitoring

### Health Checks
```bash
GET /health     # Basic liveness
GET /status     # Full system overview
GET /board      # Task board status
GET /events     # Event bus history
```

### Error Recovery
- Automatic daemon reconnection
- Failed task retry with exponential backoff
- Circuit breakers for external API calls
- Graceful degradation when components fail

### Observability
- Structured logging to `/tmp/p10-*.log`
- WebSocket message tracing
- Task execution metrics
- Agent performance analytics

## Next Steps

- **[Components](components.md)** - Detailed component breakdown
- **[Task Lifecycle](task-lifecycle.md)** - Follow a task through the system
- **[Pipeline System](pipelines.md)** - Multi-agent orchestration details
- **[Memory System](memory.md)** - Knowledge compression architecture