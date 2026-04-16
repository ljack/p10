# Component Architecture

Detailed breakdown of P10's five daemon types and their responsibilities.

## Component Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    P10 DAEMON MESH                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Browser   │  │   Master    │  │     Pi Daemon       │  │
│  │   Daemon    │◄►│   Daemon    │◄►│   (AI Agent)        │  │
│  │             │  │   :7777     │  │                     │  │
│  │ • Preview   │  │ • Registry  │  │ • Claude + pi SDK   │  │
│  │ • Errors    │  │ • Router    │  │ • File read/write   │  │
│  │ • API watch │  │ • Board     │  │ • Code execution    │  │
│  │ • State     │  │ • Memory    │  │ • Role switching    │  │
│  └─────────────┘  │ • Security  │  └─────────────────────┘  │
│                   │ • Pipelines │  ┌─────────────────────┐  │
│                   │ • Events    │◄►│   Telegram Bot      │  │
│                   └─────────────┘  └─────────────────────┘  │
│                         ▲         ┌─────────────────────┐  │
│                         └────────►│   Pi CLI ×N         │  │
│                                   └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Master Daemon

**Location:** `p10-master/`  
**Port:** 7777  
**Role:** Central coordinator and brain of the mesh

### Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| `index.ts` | ~400 | HTTP server, REST API, WebSocket setup |
| `registry.ts` | ~200 | Daemon registration, heartbeat monitoring |
| `router.ts` | ~300 | Message routing, smart targeting |
| `security.ts` | ~150 | Risk classification, approval gates |
| `taskBoard.ts` | ~400 | Kanban board CRUD operations |
| `taskAnalyst.ts` | ~250 | AI-powered task enrichment |
| `boardMemory.ts` | ~500 | Progressive knowledge compression |
| `groomingAgent.ts` | ~200 | Board maintenance, archival |
| `pipelineExecutor.ts` | ~450 | Multi-agent pipeline orchestration |
| `autonomousRun.ts` | ~300 | Fire-and-forget overnight runs |
| `decomposer.ts` | ~200 | LLM task decomposition |
| `eventBus.ts` | ~150 | Pub/sub event system |
| `planSync.ts` | ~200 | PLAN.md ↔ board sync |
| `messageTracker.ts` | ~100 | Task origin tracking |
| `integrations.ts` | ~150 | Telegram setup |

### Key Responsibilities

**1. Daemon Registry**
```typescript
// Tracks all connected daemons
interface DaemonEntry {
  id: string;
  type: 'pi' | 'browser' | 'telegram' | 'custom';
  ws: WebSocket;
  status: 'alive' | 'stale' | 'dead';
  lastHeartbeat: Date;
  capabilities: string[];
  metadata: Record<string, any>;
}
```

**2. Message Routing**
```typescript
// Smart routing based on message type and target
function routeMessage(msg: Message): void {
  if (msg.to === '*') {
    // Auto-route: tasks→pi, queries→browser
    if (msg.type === 'task') routeToPi(msg);
    else if (msg.type === 'query') routeToBrowser(msg);
  } else if (msg.to === 'broadcast') {
    broadcastToAll(msg);
  } else {
    routeToDaemon(msg.to, msg);
  }
}
```

**3. Security Gate**
```typescript
// Classify operation risk before routing
function classifyRisk(operation: string): RiskLevel {
  if (CRITICAL_PATTERNS.some(p => p.test(operation))) return 'critical';
  if (HIGH_PATTERNS.some(p => p.test(operation))) return 'high';
  if (MEDIUM_PATTERNS.some(p => p.test(operation))) return 'medium';
  return 'low';
}
```

## Pi Daemon

**Location:** `p10-pi-daemon/`  
**Role:** AI-powered code execution engine

### Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| `index.ts` | ~300 | WebSocket client, task handling |
| `wsClient.ts` | ~150 | Connection management, reconnection |
| `roles.ts` | ~200 | Agent role definitions and prompts |
| `modelRouter.ts` | ~100 | Intelligent model selection |

### Agent Roles

```typescript
const ROLES = {
  planning_agent: {
    focus: 'Requirements analysis and architecture',
    prompt: 'You are a senior software architect...',
    model: 'claude-3-sonnet'
  },
  api_agent: {
    focus: 'Backend APIs and server logic',
    prompt: 'You are an expert backend developer...',
    model: 'claude-3-sonnet'
  },
  web_agent: {
    focus: 'Frontend components and UI',
    prompt: 'You are a frontend specialist...',
    model: 'claude-3-sonnet'
  },
  review_agent: {
    focus: 'Code review and quality assurance',
    prompt: 'You are a code reviewer and QA specialist...',
    model: 'claude-3-opus'
  }
};
```

### Model Router

```typescript
function selectModel(task: Task): string {
  const complexity = analyzeComplexity(task.instruction);
  
  if (complexity === 'simple') return 'claude-3-haiku';
  if (complexity === 'complex') return 'claude-3-sonnet';
  if (complexity === 'critical') return 'claude-3-opus';
  
  return 'claude-3-sonnet'; // default
}
```

### Task Execution Flow

```
Task Received → Role Assignment → Model Selection → 
pi SDK Execution → Result Capture → Send Result
```

## Browser Daemon

**Location:** `svelteapp/src/lib/daemon/`  
**Role:** Real-time development feedback and monitoring

### Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| `browserDaemon.ts` | ~250 | WebSocket client, state reporting |
| `errorWatcher.ts` | ~150 | Automatic error detection |
| `stateManager.ts` | ~200 | Container state tracking |

### Capabilities

**1. Container Monitoring**
```typescript
interface ContainerState {
  status: 'booting' | 'running' | 'error' | 'stopped';
  preview: {
    url: string;
    ready: boolean;
  };
  build: {
    status: 'idle' | 'building' | 'success' | 'error';
    errors: string[];
  };
}
```

**2. Autonomous Error Watch**
```typescript
// Detects errors and auto-requests fixes
async function watchErrors(): Promise<void> {
  const errors = await detectErrors();
  
  for (const error of errors) {
    if (fixAttempts[error.id] < MAX_FIX_ATTEMPTS) {
      await requestFix(error);
      fixAttempts[error.id]++;
    }
  }
}
```

**3. API Discovery**
```typescript
// Discovers Express routes for API explorer
function discoverRoutes(): Route[] {
  return parseExpressApp(containerFS);
}
```

## Telegram Bot

**Location:** `p10-telegram/`  
**Role:** Mobile and remote mesh access

### Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| `index.ts` | ~300 | Bot setup, command handlers |
| `messageHandler.ts` | ~200 | Bidirectional routing |

### Commands

| Command | Handler | Purpose |
|---------|---------|---------|
| `/start` | `handleStart` | Welcome, show commands |
| `/status` | `handleStatus` | Mesh health overview |
| `/board` | `handleBoard` | Kanban board summary |
| `/add` | `handleAdd` | Guided task creation |
| `/task` | `handleTask` | Send coding task |
| `/query` | `handleQuery` | Query any daemon |
| `/debug` | `handleDebug` | Debug snapshot |

### Guided Task Flow

```
User: /add
Bot: "What's the task title?"
User: "Add user authentication"
Bot: "Add a description (or /skip):"
User: /skip
Bot: "Priority?" [Low] [Normal] [High] [Urgent]
User: [High]
Bot: "✅ Task added: Add user authentication (high priority)"
```

## Pi CLI Extensions

**Location:** `.pi/extensions/`  
**Role:** CLI integration with the mesh

### Available Tools

| Tool | Category | Purpose |
|------|----------|---------|
| `mesh_status` | System | Daemon health |
| `mesh_task` | Tasks | Send coding task |
| `mesh_query` | Tasks | Query daemons |
| `mesh_board` | Board | Get board state |
| `mesh_add_task` | Board | Add task |
| `mesh_pipeline` | Pipeline | Launch pipeline |
| `mesh_pipeline_status` | Pipeline | Check progress |
| `mesh_pipeline_cancel` | Pipeline | Cancel pipeline |
| `mesh_pipeline_rerun` | Pipeline | Retry failed |
| `mesh_run` | Autonomous | Start overnight run |
| `mesh_run_status` | Autonomous | Check run progress |
| `mesh_run_pause` | Autonomous | Pause run |
| `mesh_run_resume` | Autonomous | Resume run |
| `mesh_run_cancel` | Autonomous | Cancel run |
| `mesh_events` | Events | Get event history |
| `emit_mesh_event` | Events | Emit event |
| `mesh_debug` | Debug | Browser snapshot |
| `mesh_setup_telegram` | Integration | Setup Telegram |
| `mesh_new_project` | System | Reset workspace |

## Component Communication

### Message Flow Example

```
User types in browser → Browser sends to Master → 
Master routes to Pi Daemon → Pi executes with Claude →
Pi sends result to Master → Master updates Board →
Master broadcasts to Browser → Browser updates UI
```

### Heartbeat System

```
Every 5 seconds:
├── Each daemon sends heartbeat to Master
├── Master updates daemon status
├── Master marks stale daemons (no heartbeat > 15s)
└── Master marks dead daemons (no heartbeat > 30s)
```

## Scaling Considerations

### Horizontal Scaling
- Multiple Pi daemons can run simultaneously
- Master load-balances tasks across available agents
- Each daemon has unique ID for routing

### Vertical Scaling
- Model router optimizes for task complexity
- Context caching reduces redundant API calls
- Progressive memory reduces context window pressure

## Next Steps

- **[Memory System](memory.md)** - Knowledge compression
- **[Pipeline System](pipelines.md)** - Multi-agent orchestration
- **[Overview](overview.md)** - System architecture