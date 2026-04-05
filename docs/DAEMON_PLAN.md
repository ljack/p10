# P10 Daemon Architecture Plan

> Multi-agent daemon mesh with heartbeat, auto-discovery, and inter-daemon communication

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    P10 DAEMON MESH                          │
│                                                             │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────┐ │
│  │ Browser       │◄──►│ Master Daemon  │◄──►│ Pi Daemon    │ │
│  │ Daemon        │    │ (Gateway)     │    │ (CLI Agent)  │ │
│  │               │    │               │    │              │ │
│  │ • WebContainer│    │ • Registry    │    │ • pi SDK     │ │
│  │ • Preview     │    │ • Router      │    │ • Tools      │ │
│  │ • Chat UI     │    │ • Heartbeat   │    │ • Session    │ │
│  │ • Bridge      │    │   Monitor     │    │ • Multi-model│ │
│  │ • Auto-fix    │    │ • Task Queue  │    │ • Memory     │ │
│  └──────────────┘    │ • Security    │    └──────────────┘ │
│                      │ • Model Pool  │                      │
│  ┌──────────────┐    │ • TLDR Engine │    ┌──────────────┐ │
│  │ Future:       │◄──►│               │◄──►│ Future:      │ │
│  │ Test Daemon   │    └───────────────┘    │ Deploy Daemon│ │
│  └──────────────┘                         └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Master Daemon (Standalone Node.js Process)

### 1.1 Core Process (`p10-master/`)

```
p10-master/
├── src/
│   ├── index.ts              # Entry point, start daemon
│   ├── server.ts             # WebSocket + HTTP server
│   ├── registry.ts           # Daemon registration & discovery
│   ├── heartbeat.ts          # Heartbeat monitor
│   ├── router.ts             # Message routing between daemons
│   ├── security.ts           # Command validation, destructive op guard
│   ├── taskQueue.ts          # Task assignment & tracking
│   ├── modelPool.ts          # Multi-model management, failover
│   ├── tldr.ts               # TLDR generation for cross-daemon summaries
│   └── types.ts              # Shared protocol types
├── package.json
└── tsconfig.json
```

### 1.2 Protocol

```typescript
// Every daemon message follows this shape
interface DaemonMessage {
  id: string;                    // Unique message ID
  from: string;                  // Sender daemon ID
  to: string | 'master' | '*';  // Target daemon or broadcast
  type: DaemonMessageType;
  payload: any;
  timestamp: string;
}

type DaemonMessageType =
  // Lifecycle
  | 'heartbeat'          // { status, tldr, metrics }
  | 'register'           // { name, type, capabilities }
  | 'unregister'
  // Commands  
  | 'task'               // { instruction, context, priority }
  | 'task_result'        // { taskId, result, errors }
  | 'query'              // { question, context }
  | 'query_response'     // { queryId, answer }
  // State
  | 'state_snapshot'     // { snapshot }
  | 'state_request'      // {}
  // LLM
  | 'llm_request'        // { prompt, model?, maxTokens? }
  | 'llm_response'       // { requestId, text, model, tokens }
  | 'llm_stream_start'   // { requestId }
  | 'llm_stream_delta'   // { requestId, delta }
  | 'llm_stream_end'     // { requestId }
  // Security
  | 'approval_request'   // { operation, details, risk }
  | 'approval_response'  // { requestId, approved, reason }
  ;

interface DaemonRegistration {
  id: string;
  name: string;
  type: 'browser' | 'pi' | 'master' | 'test' | 'deploy';
  capabilities: string[];
  wsUrl?: string;
  lastHeartbeat: string;
  status: 'alive' | 'stale' | 'dead';
  tldr: string;
}
```

### 1.3 Heartbeat Protocol

```
Every 5 seconds, each daemon sends:
  → { type: 'heartbeat', payload: { status, tldr, metrics } }

Master tracks:
  - Last heartbeat time per daemon
  - If no heartbeat for 15s → status: 'stale'
  - If no heartbeat for 30s → status: 'dead', notify other daemons
  
TLDR in heartbeat is crucial:
  - Browser daemon: "Container running, 2 servers, todo app built, 3 errors in console"
  - Pi daemon: "Idle, last task: fixed API explorer, 42 files modified today"
  - Master: aggregates all TLDRs into a system-wide TLDR
```

### 1.4 Security Guard

```typescript
// Every command goes through security validation
interface SecurityCheck {
  operation: string;     // e.g., 'bash', 'write_file', 'rm'
  risk: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  details: string;
}

// Critical operations require human approval:
// - rm -rf (any recursive delete)
// - Modifying system files outside project
// - Installing unknown packages
// - Network operations to unknown hosts
// - Any operation with 'sudo'
// - Deleting git history
// - Publishing packages
```

## Phase 2: Browser Daemon

### 2.1 Integration with existing P10 app

The Browser Daemon runs inside the SvelteKit app. It extends the existing debug bus.

```
svelteapp/src/lib/daemon/
├── browserDaemon.svelte.ts    # Main daemon class
├── wsClient.ts                # WebSocket client to Master
├── heartbeat.ts               # Heartbeat sender
├── autonomousAgent.ts         # Autonomous actions (auto-fix, etc.)
└── capabilities.ts            # What this daemon can do
```

### 2.2 Capabilities

- `container.read_file` / `container.write_file`
- `container.run_command`
- `container.restart_backend`
- `preview.screenshot`
- `preview.get_errors`
- `api_explorer.discover_routes`
- `api_explorer.test_endpoint`
- `chat.send_message` (to the P10 AI agent in browser)
- `chat.get_history`
- `state.get_snapshot`

### 2.3 Autonomous Behaviors

When no human is typing:
1. **Error watch** — detect build errors → auto-send to LLM for fix
2. **Health check** — periodically test API endpoints
3. **Route discovery** — refresh API Explorer when backend changes
4. **Preview monitoring** — detect blank/crashed previews

## Phase 3: Pi Daemon

### 3.1 Using pi SDK

The Pi Daemon is a standalone Node.js process that embeds the pi agent via SDK.

```
p10-pi-daemon/
├── src/
│   ├── index.ts              # Entry point
│   ├── daemon.ts             # Daemon with heartbeat
│   ├── wsClient.ts           # WebSocket to Master
│   ├── piAgent.ts            # pi SDK agent session
│   ├── memory.ts             # Persistent memory (soul.md, etc.)
│   ├── modelRouter.ts        # Multi-model routing
│   └── taskHandler.ts        # Handle tasks from Master
├── memory/
│   ├── soul.md               # Daemon personality & core directives
│   ├── memory.md             # Accumulated knowledge
│   └── history.md            # Session history summaries
├── package.json
└── tsconfig.json
```

### 3.2 Pi SDK Integration

```typescript
import {
  AuthStorage, ModelRegistry, SessionManager,
  createAgentSession, createAgentSessionRuntime,
  createAgentSessionServices, createAgentSessionFromServices,
  getAgentDir, codingTools, defineTool
} from '@mariozechner/pi-coding-agent';

// Custom tools for daemon communication
const masterQueryTool = defineTool({
  name: 'query_daemon',
  description: 'Query another daemon via the Master',
  parameters: Type.Object({
    target: Type.String({ description: 'Target daemon ID' }),
    question: Type.String({ description: 'What to ask' })
  }),
  execute: async (_id, { target, question }) => {
    const response = await wsClient.query(target, question);
    return { content: [{ type: 'text', text: response }], details: {} };
  }
});

const browserSnapshotTool = defineTool({
  name: 'browser_snapshot',
  description: 'Get current state of the P10 browser app',
  parameters: Type.Object({}),
  execute: async () => {
    const snapshot = await wsClient.query('browser', 'state_snapshot');
    return { content: [{ type: 'text', text: JSON.stringify(snapshot) }], details: {} };
  }
});
```

### 3.3 Multi-Model Routing

```typescript
// Use pi's built-in model registry + failover
const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);
const available = await modelRegistry.getAvailable();

// Route by task type
function pickModel(taskType: string): Model {
  switch (taskType) {
    case 'planning':     return find('anthropic', 'claude-opus-4-5') ?? fallback();
    case 'coding':       return find('anthropic', 'claude-sonnet-4') ?? fallback();
    case 'quick-fix':    return find('anthropic', 'claude-haiku-3') ?? fallback();
    case 'review':       return find('openai', 'gpt-4o') ?? fallback();
    default:             return fallback();
  }
}

// Failover chain
async function withFailover(fn: (model: Model) => Promise<any>, models: Model[]) {
  for (const model of models) {
    try { return await fn(model); }
    catch (e) {
      if (isThrottle(e) || isOutOfCredits(e)) continue;
      throw e;
    }
  }
  throw new Error('All models exhausted');
}
```

### 3.4 Persistent Memory

```markdown
<!-- soul.md -->
# Pi Daemon Soul

I am the Pi Daemon for the P10 project. I assist in building the P10
AI-powered software development platform.

## My Role
- Execute coding tasks assigned by the Master Daemon
- Monitor and fix code issues
- Review code quality
- Manage git operations
- Communicate with the Browser Daemon for preview feedback

## My Principles
- Never execute destructive operations without verification
- Always check build status after making changes
- Prefer small, focused changes over large rewrites
- Communicate my TLDR status clearly in every heartbeat
```

## Phase 4: Execution Plan

### Sprint D1: Master Daemon Foundation (2-3 hours)
- [ ] Create `p10-master/` project with TypeScript
- [ ] WebSocket server (ws library)
- [ ] HTTP server for health/status endpoint
- [ ] Daemon registry (register, unregister, list)
- [ ] Heartbeat monitor (alive/stale/dead tracking)
- [ ] Message routing (point-to-point, broadcast)
- [ ] Security guard (destructive operation detection)
- [ ] TLDR aggregation
- [ ] CLI: `npx p10-master` to start

### Sprint D2: Browser Daemon (2-3 hours)
- [ ] WebSocket client in SvelteKit
- [ ] Heartbeat sender (5s interval)
- [ ] State snapshot provider (extends debug bus)
- [ ] Register capabilities with Master
- [ ] Receive and execute commands from Master
- [ ] Autonomous error detection loop
- [ ] Connect to existing debug bus infrastructure

### Sprint D3: Pi Daemon (2-3 hours)
- [ ] Create `p10-pi-daemon/` project
- [ ] pi SDK integration (createAgentSession)
- [ ] WebSocket client to Master
- [ ] Heartbeat with TLDR
- [ ] Task handler (receive task → prompt pi → return result)
- [ ] Custom tools (query_daemon, browser_snapshot)
- [ ] Memory persistence (soul.md, memory.md)
- [ ] Model routing with failover

### Sprint D4: Inter-Daemon Communication (1-2 hours)
- [ ] Pi Daemon queries Browser Daemon for state
- [ ] Browser Daemon requests Pi Daemon to fix code
- [ ] Master routes messages between daemons
- [ ] TLDR chain: Browser → Master → Pi
- [ ] Error escalation: Browser detects error → Master → Pi auto-fixes

### Sprint D5: Auto-Discovery & Security (1-2 hours)
- [ ] Master publishes its address via well-known file (`/tmp/p10-master.json`)
- [ ] Daemons auto-discover Master on startup
- [ ] Secure binding with shared secret
- [ ] Destructive operation approval flow
- [ ] Rate limiting on LLM requests

### Sprint D6: Integration Testing (1 hour)
- [ ] Start all three daemons
- [ ] Browser builds app → error occurs → auto-fix via Pi Daemon
- [ ] Pi Daemon queries browser state
- [ ] Master shows aggregated TLDR
- [ ] Destructive operation blocked and approved

## Implementation Order

I'll work through these independently:

1. **D1** first — Master is needed by everything else
2. **D3** next — Pi Daemon uses pi SDK, can work standalone
3. **D2** then — Browser Daemon connects to Master
4. **D4** — wire them together
5. **D5** — security & discovery
6. **D6** — integration test

Estimated total: 8-12 hours of autonomous work.

## Open Decisions

- Master daemon port: **7777** (arbitrary, configurable)
- Heartbeat interval: **5 seconds**
- Stale threshold: **15 seconds**
- Dead threshold: **30 seconds**
- Max auto-fix attempts: **3 per error**
- LLM request timeout: **120 seconds**
