# Board Activity Tracking — Pipelines, CLI Work, and Metadata on the Board

## Problem
The board doesn't reflect what's actually happening. Pipelines execute invisibly —
6 sub-tasks run but the board shows nothing in "in-progress". Pi CLI sessions do work
(edit files, run commands, commit code) with no board trace. There's no way to link
git commits or other artifacts to the work that produced them.

## Goals
1. **One board task per pipeline** — shows in-progress with live sub-task states inline
2. **Pi CLI activity tracking** — CLI work creates board tasks automatically
3. **Metadata linking** — git commits, files changed, etc. attached to tasks

## Design

### 1. Pipeline → Board Task (with inline sub-tasks)

When a pipeline starts, create ONE board task with pipeline linkage:

```typescript
// New fields on BoardTask:
interface BoardTask {
  // ... existing fields ...
  pipelineId?: string;          // Links to TaskPipeline.id
  subtasks?: BoardSubtask[];    // Inline pipeline steps (denormalized for display)
}

interface BoardSubtask {
  id: string;
  role: string;                 // api_agent, web_agent, review_agent
  instruction: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  result?: string;
}
```

**Lifecycle:**
1. `POST /pipeline` → decompose → create board task:
   - title: pipeline instruction
   - column: `in-progress`
   - pipelineId: pipeline.id
   - subtasks: populated from pipeline.tasks (all pending initially)
2. As pipeline executes, master updates subtask statuses on the board task
3. Pipeline completes → board task moves to `done` (or `failed`)
4. Subtasks preserved as history inside the board task

**Where to wire:** `pipelineExecutor.ts` — after each task completes,
call `taskBoard.updateSubtasks(boardTaskId, pipelineTaskId, status, result)`.

### 2. Pi CLI Activity → Board Tasks

When a pi CLI session starts meaningful work, create a board task.

**What counts as "meaningful work":**
- Agent receives a user prompt and starts processing
- NOT: tool calls, file reads, status checks

**Approach:** The pi mesh extension already connects via WebSocket. Add a hook
that emits an event when the agent starts working on a user message:

```
pi CLI user sends prompt
  → extension emits: agent.cli.task.started { sessionId, prompt preview }
  → master creates board task: column=in-progress, origin=pi-cli
  
agent finishes response
  → extension emits: agent.cli.task.done { sessionId, summary }
  → master moves board task to done
```

**Lightweight approach** (less invasive): Pi CLI reports activity via heartbeat
TLDR changes. Master detects transition from idle → working and creates a task.
But this is fragile. Better to use explicit events from the extension.

**Even simpler (recommended for v1):** Don't auto-create for every prompt.
Instead, when pi CLI uses mesh tools (mesh_task, mesh_pipeline, mesh_add_task),
those already create board tasks. For free-form CLI work, the user can
`/board add "working on X"` or the activity feed shows what's happening.

→ **Decision: v1 = pipelines auto-create board tasks. CLI activity = via
activity events (already implemented). Full CLI→board tracking = future.**

### 3. Metadata Linking

New field on BoardTask for attached metadata:

```typescript
interface TaskMeta {
  type: 'git_commit' | 'files_changed' | 'error' | 'url' | 'note';
  label: string;
  data: string;                 // commit hash, file list, URL, etc.
  timestamp: string;
}

interface BoardTask {
  // ... existing fields ...
  meta?: TaskMeta[];
}
```

**Git commit linking:**
- After pipeline completes, if there are uncommitted changes, the review_agent
  could auto-commit with the pipeline ID in the message
- Or: master watches for git events and links commits to the active in-progress task
- **v1:** Just add the `meta` field. Populate it manually or from pipeline results.
  Auto-linking = future.

**Pipeline result linking:**
- When each subtask completes, attach a summary to meta:
  `{ type: 'note', label: 'api_agent result', data: 'Created /api/notes endpoints' }`

### 4. Board Display Updates

**mesh_board tool output** — when a task has subtasks, show them inline:

```
▶ in-progress (1):
  🔄 Build auth with login and registration [pipeline]
     ✅ [api_agent] Create auth endpoints
     ✅ [api_agent] Add JWT middleware  
     🔄 [web_agent] Build login form
     ○  [web_agent] Build registration form
     ○  [review_agent] Verify auth flow
```

**REST API** — `GET /board` already returns full tasks. Subtasks and meta
are just new fields, no API changes needed.

**Telegram /board** — same inline rendering.

## Files to Change

### taskBoard.ts
- Add `pipelineId`, `subtasks`, `meta` fields to BoardTask
- Add `updateSubtask(taskId, subtaskId, status, result)` method
- Add `addMeta(taskId, meta)` method

### pipelineExecutor.ts
- On pipeline start: create board task with subtasks
- On each task status change: update subtask on board task
- On pipeline complete: move board task to done/failed

### p10-mesh.ts (extension)
- Update mesh_board display to show subtasks inline
- Update mesh_pipeline_status to link to board task

### index.ts (master)
- No major changes — pipelineExecutor handles the wiring

### Telegram /board
- Show subtasks inline (same format as CLI)

## Implementation Order

1. **BoardTask schema** — add pipelineId, subtasks, meta fields + methods
2. **PipelineExecutor → Board** — create/update board task during execution
3. **Display** — update mesh_board tool + Telegram /board to show subtasks
4. **Meta linking** — add meta field, populate from pipeline results

## Estimated Effort
~60-80 lines across 4 files. Schema is simple, wiring is straightforward.
