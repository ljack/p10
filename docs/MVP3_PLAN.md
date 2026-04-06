# MVP 3: Multi-Agent Orchestration — Detailed Plan

> Single Pi Daemon with role switching, Master as orchestrator, sequential pipeline with transparency.

## Architecture

```
User: "Build auth"
       │
       ▼
┌─────────────────────────────────────────────────┐
│  MASTER DAEMON (Orchestrator)                    │
│                                                  │
│  1. Complexity check: simple → LLM decompose     │
│                       complex → use PLAN.md      │
│                                                  │
│  2. Decompose into task pipeline:                │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│     │ API tasks │→ │ Web tasks│→ │ Review   │   │
│     └──────────┘  └──────────┘  └──────────┘   │
│                                                  │
│  3. Execute sequentially, route to Pi Daemon     │
│     with role-specific system prompt             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  PI DAEMON (Role-switching agent)                │
│                                                  │
│  Current role: api_agent                         │
│  System prompt: "You are the API Agent..."       │
│  Context: server/index.js, API_CONTRACT          │
│                                                  │
│  → Writes server/index.js                        │
│  → Reports completion                            │
│                                                  │
│  Role switch → web_agent                         │
│  System prompt: "You are the Web Agent..."       │
│  Context: src/App.jsx, /_routes (live contract)  │
│                                                  │
│  → Writes src/App.jsx, src/App.css               │
│  → Reports completion                            │
└─────────────────────────────────────────────────┘
```

## Components to Build

### 1. Task Decomposer (Master: `src/decomposer.ts`)

Takes a user instruction, classifies complexity, produces a task pipeline.

```typescript
interface TaskPipeline {
  id: string;
  instruction: string;           // Original user request
  approach: 'direct' | 'decomposed' | 'plan-driven';
  tasks: PipelineTask[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  currentTaskIndex: number;
  createdAt: string;
  completedAt?: string;
}

interface PipelineTask {
  id: string;
  role: AgentRole;               // Which agent role executes this
  instruction: string;           // Task-specific instruction
  context?: string;              // Files/artifacts to include
  dependsOn?: string[];          // Task IDs that must complete first
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  result?: string;
}

type AgentRole = 'planning_agent' | 'api_agent' | 'web_agent' | 'review_agent';
```

**Complexity heuristic:**
- Simple: ≤10 words, single concern ("build todo app", "add dark theme")
- Complex: multiple features, mentions architecture, or has PLAN.md ready

**Simple decomposition (LLM call):**
```
System: "You are a task decomposer. Given a user request, break it into 
ordered sub-tasks for these agent roles: api_agent (backend), web_agent 
(frontend), review_agent (testing/verification).

Output JSON array of {role, instruction} objects. API tasks before Web tasks.
Keep it to 3-6 tasks. Be specific."

User: "Build auth"

Output: [
  { role: "api_agent", instruction: "Create auth endpoints: POST /api/auth/register, POST /api/auth/login. Use in-memory user store. Hash passwords. Return JWT tokens." },
  { role: "api_agent", instruction: "Add auth middleware that verifies JWT from Authorization header." },
  { role: "web_agent", instruction: "Create a login form with email/password fields. On submit, POST to /api/auth/login. Store token in localStorage." },
  { role: "web_agent", instruction: "Create a registration form. On submit, POST to /api/auth/register. Redirect to login on success." },
  { role: "web_agent", instruction: "Add protected route wrapper. Redirect to login if no token." },
  { role: "review_agent", instruction: "Verify the auth flow: register a user, login, access protected route." }
]
```

**Plan-driven decomposition:**
- Read PLAN.md from spec manager
- Parse checkboxes into PipelineTasks
- Assign roles based on task content (mentions "API"/"endpoint" → api_agent, mentions "component"/"UI"/"page" → web_agent)

### 2. Agent Roles (Pi Daemon: `src/roles.ts`)

Each role has a specific system prompt and context strategy.

```typescript
interface AgentRoleConfig {
  name: AgentRole;
  systemPrompt: string;
  contextFiles: string[];        // Files to read before executing
  focusArea: string;             // For TLDR reporting
}
```

**Roles:**

| Role | Focus | Context | Key instructions |
|------|-------|---------|-----------------|
| `planning_agent` | Decompose, plan, spec | PLAN.md, SPEC docs | "Break this into tasks, don't write code" |
| `api_agent` | Backend endpoints | `server/index.js`, `package.json` | "Write Express routes, ES modules, preserve /_routes" |
| `web_agent` | React frontend | `src/App.jsx`, `src/App.css`, `/_routes` discovery | "Build React components, fetch from /api/*" |
| `review_agent` | Verify & test | All source files, `/_routes`, preview errors | "Check for errors, test endpoints, verify UI renders" |

**Context strategy for each role:**
- `api_agent`: Reads `server/index.js` before writing (to not lose existing routes)
- `web_agent`: Calls `/_routes` via bridge to know available API endpoints before building UI
- `review_agent`: Reads error store + `/_routes` + key source files

### 3. Pipeline Executor (Master: `src/pipelineExecutor.ts`)

Executes tasks sequentially, switching roles on the Pi Daemon.

```typescript
class PipelineExecutor {
  // Execute a full pipeline
  async execute(pipeline: TaskPipeline): Promise<void> {
    for (const task of pipeline.tasks) {
      // Skip if dependencies not met
      if (!this.dependenciesMet(task, pipeline)) {
        task.status = 'skipped';
        continue;
      }

      // Broadcast pipeline progress to all daemons
      this.broadcastProgress(pipeline);

      // Send task to Pi Daemon with role info
      task.status = 'active';
      pipeline.currentTaskIndex = pipeline.tasks.indexOf(task);
      
      const result = await this.executeTask(task);
      
      if (result.error) {
        task.status = 'failed';
        // Ask review_agent to diagnose, or retry once
        if (task.role !== 'review_agent') {
          await this.attemptRecovery(task, result.error, pipeline);
        }
      } else {
        task.status = 'completed';
        task.result = result.result;
      }

      // Wait for side effects (backend restart, hot-reload)
      await this.waitForSideEffects(task);
    }

    pipeline.status = 'completed';
    pipeline.completedAt = new Date().toISOString();
    this.broadcastProgress(pipeline);
  }

  private async executeTask(task: PipelineTask): Promise<any> {
    // Send to Pi Daemon with role metadata
    return masterFetch('/task-with-role', {
      instruction: task.instruction,
      role: task.role,
      context: task.context,
      taskId: task.id,
    });
  }

  private async waitForSideEffects(task: PipelineTask) {
    if (task.role === 'api_agent') {
      // Backend needs time to restart via --watch
      await sleep(5000);
    } else if (task.role === 'web_agent') {
      // Vite hot-reload is fast
      await sleep(2000);
    }
  }

  private async attemptRecovery(task, error, pipeline) {
    // Insert a review_agent task to diagnose
    const recoveryTask = {
      id: makeId(),
      role: 'review_agent',
      instruction: `The previous task failed: "${task.instruction}". Error: ${error}. Diagnose and fix.`,
      status: 'pending'
    };
    // Execute recovery inline
    await this.executeTask(recoveryTask);
  }
}
```

### 4. Pipeline Activity Panel (Browser: `PipelinePanel.svelte`)

Shows in the agent status bar / bottom bar:

```
┌─ Pipeline: "Build auth" ────────────────────────────────────┐
│                                                              │
│  ✅ api_agent  Create auth endpoints          (completed)    │
│  ✅ api_agent  Add auth middleware             (completed)    │
│  🔄 web_agent  Create login form              (active)       │
│  ○  web_agent  Create registration form       (pending)      │
│  ○  web_agent  Add protected routes           (pending)      │
│  ○  review     Verify auth flow               (pending)      │
│                                                              │
│  Progress: 2/6 tasks  │  ETA: ~2 min                        │
└──────────────────────────────────────────────────────────────┘
```

### 5. Role-Aware Task Handler (Pi Daemon update)

Pi Daemon receives tasks with a `role` field and switches system prompt accordingly.

```typescript
// In Pi Daemon handleTask():
if (payload.role) {
  const roleConfig = ROLES[payload.role];
  
  // Read context files for this role
  let context = '';
  for (const file of roleConfig.contextFiles) {
    context += await readProjectFile(file);
  }
  
  // Create prompt with role system prompt + context + instruction
  const prompt = `${roleConfig.systemPrompt}\n\n## Current Code:\n${context}\n\n## Task:\n${payload.instruction}`;
  
  await session.prompt(prompt);
}
```

## Execution Plan

### Sprint M1: Task Decomposer (2 hours)
- [ ] `p10-master/src/decomposer.ts` — complexity heuristic + LLM decomposition
- [ ] Add decomposer API key config (uses same pi auth for LLM calls)
- [ ] `POST /pipeline` REST endpoint — accepts instruction, returns pipeline
- [ ] `GET /pipeline/:id` — check pipeline status
- [ ] Unit tests for complexity heuristic

### Sprint M2: Agent Roles (1 hour)
- [ ] `p10-pi-daemon/src/roles.ts` — role configs with system prompts
- [ ] Update Pi Daemon task handler to accept `role` field
- [ ] Role switches session system prompt before executing
- [ ] Context file reading per role
- [ ] Test: send api_agent task → verify correct system prompt used

### Sprint M3: Pipeline Executor (2 hours)
- [ ] `p10-master/src/pipelineExecutor.ts` — sequential execution engine
- [ ] Wire into Master's `/pipeline` endpoint
- [ ] Progress broadcasting to all daemons
- [ ] Error recovery (review_agent diagnoses failures)
- [ ] Side effect waiting (backend restart, hot-reload)
- [ ] Pipeline status tracking (pending/active/completed/failed)

### Sprint M4: Activity Panel (1 hour)
- [ ] `PipelinePanel.svelte` — shows pipeline progress in bottom bar
- [ ] Subscribe to pipeline progress via Browser Daemon
- [ ] Show task list with status icons (✅ 🔄 ○ ❌)
- [ ] Progress counter and ETA
- [ ] Add "Pipeline" tab to bottom bar

### Sprint M5: Integration & Demo (1 hour)
- [ ] End-to-end test: "Build auth" → full pipeline executes
- [ ] Verify both previews update (API endpoints + login form)
- [ ] Pipeline progress shows in browser
- [ ] Pipeline results route back to origin channel (Telegram, CLI)
- [ ] Error recovery test: introduce a bug → review_agent fixes it

### Sprint M6: Polish (1 hour)
- [ ] Pipeline can be cancelled mid-execution
- [ ] Pipeline can be re-run from a failed step
- [ ] Plan-driven mode: read PLAN.md → generate pipeline
- [ ] Update /mesh and /status commands to show active pipelines
- [ ] Update pi extension with `mesh_pipeline` tool

## Demo Script

```
User: "Build auth with login and registration"

Master: [decomposing...] → 6 tasks identified

Pipeline started:
  🔄 api_agent: Creating auth endpoints (POST /api/auth/register, /login)...
  
  [Pi Daemon switches to api_agent role]
  [Writes server/index.js with auth routes]
  [Backend restarts via --watch]
  
  ✅ api_agent: Auth endpoints created
  🔄 api_agent: Adding JWT middleware...
  
  [Writes middleware, backend restarts]
  
  ✅ api_agent: Middleware added
  🔄 web_agent: Building login form...
  
  [Pi Daemon switches to web_agent role]
  [Reads /_routes to discover /api/auth/* endpoints]
  [Writes src/LoginForm.jsx]
  [Preview hot-reloads — login form appears]
  
  ✅ web_agent: Login form built
  🔄 web_agent: Building registration form...
  
  [Writes src/RegisterForm.jsx]
  [Preview updates]
  
  ✅ web_agent: Registration form built
  🔄 web_agent: Adding protected routes...
  
  [Updates src/App.jsx with routing]
  
  ✅ web_agent: Protected routes added
  🔄 review_agent: Verifying auth flow...
  
  [Pi Daemon switches to review_agent role]
  [Tests POST /api/auth/register]
  [Tests POST /api/auth/login]
  [Checks preview for login form]
  
  ✅ review_agent: Auth flow verified

Pipeline completed: 6/6 tasks ✅
```

## Estimated Total: 8 hours
