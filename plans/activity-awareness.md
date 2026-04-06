# Activity Awareness — Mesh-wide Agent Notifications

## Problem
Agents and humans in the mesh operate in isolation. Nobody knows what others are doing.
A human in pi CLI has no idea the pi daemon just picked up a task. The browser chat
doesn't know a pipeline just failed. Telegram gets nothing unless directly addressed.
Agents can't auto-pick tasks because they don't know what's available or what others claimed.

## Goals
1. **Humans see agent activity** — pi CLI, browser chat, and Telegram show live status
2. **Agents see each other** — state transitions broadcast to all mesh participants
3. **Auto-pickup** — idle agents can claim planned tasks from the board
4. **Configurable** — verbosity toggle in pi CLI, persistent across sessions
5. **Smart Telegram** — only notify if human was active in past hour

## Design

### Part 1: Activity Events (master + pi daemon)

New event types emitted via the existing EventBus:

```
agent.task.started    — agent picked up a task        { agentId, taskId, title, role }
agent.task.blocked    — agent hit a blocker            { agentId, taskId, reason }
agent.task.done       — agent finished a task          { agentId, taskId, title, result }
agent.task.failed     — agent failed a task            { agentId, taskId, error }
agent.idle            — agent has nothing to do         { agentId, idleSince }
agent.status          — periodic status (from heartbeat){ agentId, status, currentTask }
```

**Where to emit:**
- `p10-pi-daemon/src/index.ts` — emit `agent.task.started` when `handleTask`/`handleTaskWithRole`
  begins, `agent.task.done`/`agent.task.failed` when it finishes, `agent.idle` when task
  queue is empty after completion.
- `p10-master/src/pipelineExecutor.ts` — already emits `pipeline.*`, add `agent.task.started`
  and `agent.task.done` per pipeline step.
- Board events (`board.task.*`) already fire — these become the "verbose" layer.

**Idle detection:** Track state transitions in the pi daemon. When `currentTask` goes from
non-null to null and there's no queued work, emit `agent.idle`. Derive from existing
heartbeat — compare previous vs current TLDR. No polling needed.

### Part 2: Activity Feed in Pi CLI (extension)

The WebSocket handler in `p10-mesh.ts` already receives `mesh_event` / `event_notification`
but ignores them. Wire these up:

```typescript
case 'mesh_event':
case 'event_notification': {
    const event = msg.payload;
    if (activityFeedEnabled && matchesVerbosity(event.type)) {
        ctx.ui.notify(formatActivityEvent(event), "info");
    }
    break;
}
```

**Verbosity levels** (persistent config in `~/.pi/p10-mesh.json`):
- `off` — no activity notifications
- `minimal` — only `agent.*` events (task started/done/failed/idle)
- `normal` — agent events + pipeline progress + daemon join/leave (default)
- `verbose` — everything including board mutations

**Commands:**
- `/mesh-activity [off|minimal|normal|verbose]` — set verbosity, persists to config
- `/mesh-activity` (no args) — show current setting

**Config file:** `~/.pi/p10-mesh.json`
```json
{
  "activityFeed": "normal",
  "telegramQuietHours": false
}
```

### Part 3: Auto-Pickup (pi daemon)

When a pi daemon emits `agent.idle`, the master can check the board for `planned` tasks
that are eligible for auto-execution.

**Flow:**
1. Pi daemon finishes task → emits `agent.idle` via WebSocket message
2. Master receives idle notification → checks board for auto-eligible tasks
3. If found: moves task to `in-progress`, sends `task` message to idle daemon
4. If not: does nothing (daemon stays idle)

**Auto-eligible criteria** (new field on BoardTask):
- `autoPickup: boolean` — opt-in flag, default false
- Tasks from PLAN.md are NOT auto-eligible (human plans need human approval)
- Tasks explicitly marked via board API or Telegram can be auto-eligible
- Pipeline sub-tasks are always auto-eligible (they're already decomposed)

**New master module:** `p10-master/src/autoScheduler.ts`
- Listens for `agent.idle` events
- Queries board for eligible planned tasks
- Claims task (moves to in-progress) and dispatches to idle agent
- Simple FIFO by priority — no complex scheduling yet

### Part 4: Smart Telegram Notifications

Track human activity per channel:

**New in master:** `channelActivity` map
```typescript
// channel → last human interaction timestamp
const channelActivity = new Map<string, Date>();
// Updated on: incoming task, query, /board command, any user-initiated message
```

**Telegram notification filter:**
- On any `agent.*` event, check if Telegram channel was active in past hour
- If yes → forward event as a formatted message
- If no → skip silently
- The 1-hour window is configurable in integrations.json

**Format for Telegram:**
```
🤖 Pi Agent started: "Build user settings page"
✅ Pi Agent done: "Add /api/settings endpoint" (45s)
💤 Pi Agent is idle — 2 tasks in backlog
```

### Part 5: Browser Chat

The browser daemon already receives `mesh_event` via WebSocket. Add an activity
feed component or toast notifications in the SvelteKit app. Lower priority —
the browser already has the PipelinePanel showing progress.

**Minimal approach:** Show `agent.*` events as system messages in the chat panel.

## Files to Change

### New files
1. `p10-master/src/autoScheduler.ts` — auto-pickup scheduler
2. `~/.pi/p10-mesh.json` — pi CLI activity config (created at runtime)

### Modified files
1. `p10-pi-daemon/src/index.ts` — emit `agent.*` events on task start/done/fail/idle
2. `p10-master/src/index.ts` — wire autoScheduler, track channel activity, forward events to Telegram
3. `p10-master/src/taskBoard.ts` — add `autoPickup` field to BoardTask
4. `.pi/extensions/p10-mesh.ts` — activity feed handler, verbosity config, `/mesh-activity` command
5. `p10-telegram/src/index.ts` — format and show activity notifications (if human active)
6. `p10-master/src/types.ts` — add activity-related message types if needed

## Implementation Order

1. **Pi daemon events** — emit `agent.task.started/done/failed/idle` (foundation)
2. **Pi CLI feed** — wire `mesh_event` handler + verbosity config + command (immediate value)
3. **Auto-scheduler** — master picks tasks for idle agents (the "smart" part)
4. **Telegram smart notify** — activity tracking + filtered forwarding
5. **Browser feed** — system messages in chat (lowest priority, already has PipelinePanel)

## Open Questions (experimental — decide during implementation)
- Should auto-pickup have a cooldown? (e.g., wait 10s after idle before grabbing next task)
- Should there be a max concurrent auto-tasks per agent?
- Should the browser show a persistent activity sidebar or just toasts?
- Should Telegram have a `/quiet` command to suppress notifications?
