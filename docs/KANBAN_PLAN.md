# Kanban Board — Task Tracking for P10 Mesh

> Track planned, in-progress, and completed tasks across the daemon mesh.

**Status: ✅ COMPLETE**

## Progress

- [x] **Step 1** — TaskBoard store (`p10-master/src/taskBoard.ts`)
- [x] **Step 2** — REST + WS API endpoints on Master (`GET /board`, `POST /board/task`, `PATCH /board/task/:id`, `DELETE /board/task/:id`)
- [x] **Step 3** — KanbanBoard Svelte component (`svelteapp/src/lib/components/KanbanBoard.svelte`)
- [x] **Step 4** — Wire into existing MessageTracker/Router flow (auto: planned → in-progress → done/failed)
- [x] **Step 5** — PLAN.md bidirectional sync (`p10-master/src/planSync.ts`)
- [x] **Step 6** — Pi CLI `/board` command + `mesh_board` tool + Telegram `/board` command

## Overview

Extend the existing `MessageTracker` into a full column-based task board that tracks tasks as they flow through the mesh. Visualize in the browser app, query from pi CLI and Telegram.

```
┌─────────────────────────────────────────────────────┐
│                   Task Board Store                   │
│            (p10-master/src/taskBoard.ts)              │
│                                                      │
│  Planned       In Progress       Done       Failed   │
│  ┌──────┐     ┌──────────┐    ┌──────┐    ┌─────┐  │
│  │PLAN.md│     │ active   │    │result│    │error│  │
│  │items  │     │ tasks    │    │      │    │     │  │
│  └──────┘     └──────────┘    └──────┘    └─────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket events
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    Browser Panel   Pi CLI ext   Telegram /board
```

## Step 1 — TaskBoard Store (~200 lines)

New file: `p10-master/src/taskBoard.ts`

```typescript
type TaskColumn = 'planned' | 'in-progress' | 'done' | 'failed' | 'blocked';

interface BoardTask {
  id: string;
  title: string;            // short summary
  instruction: string;      // full task text
  column: TaskColumn;
  assignedTo?: string;      // daemon ID
  origin: { channel: string; userId?: string; userName?: string };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  parentId?: string;        // for subtask grouping
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: string;
}
```

- Stores tasks in a Map, organized by column
- Methods: `add()`, `move()`, `assign()`, `complete()`, `fail()`, `getBoard()`, `getColumn()`
- Emits `board.task.moved` events via EventBus on column changes
- In-memory (no persistence needed for MVP — rebuilds from MessageTracker on restart)

## Step 2 — REST + WebSocket API (~80 lines)

New endpoints on Master (`p10-master/src/index.ts`):

| Endpoint | Purpose |
|---|---|
| `GET /board` | Full board state (all columns) |
| `GET /board/:column` | Tasks in one column |
| `POST /board/task` | Add a planned task manually |
| `PATCH /board/task/:id` | Move task between columns, update priority |
| `DELETE /board/task/:id` | Remove from board |

WebSocket: broadcast `board_update` mesh event on any board change.

## Step 3 — KanbanBoard Svelte Component (~150 lines)

New file: `svelteapp/src/lib/components/KanbanBoard.svelte`

- 4 columns: Planned → In Progress → Done → Failed
- Each card shows: title, origin icon (🤖/💬/🌐), priority badge, elapsed time
- Live updates via Browser Daemon WebSocket (listen for `board_update` mesh events)
- New tab/panel alongside Web/API/Mobile previews in the UI
- Optional: drag-and-drop to manually reorder or move tasks

## Step 4 — Wire Into Existing Flow (~50 lines)

Modify existing code to auto-feed the board:

| Current code | Change |
|---|---|
| `MessageTracker.track()` | Also creates board task as `planned` |
| `router.route()` (when task is routed) | Moves to `in-progress`, sets `assignedTo` |
| `task_result` handler in `index.ts` | Moves to `done` or `failed` based on result |
| Security block in `router.route()` | Moves to `blocked` |

## Step 5 — PLAN.md Sync (~60 lines)

- When the agent generates/updates PLAN.md, parse `- [ ] task` lines → create `planned` board tasks
- When `- [x] task` detected → mark as `done` on board
- Reverse: completing a board task updates the checkbox in PLAN.md
- Triggered by `state.file.changed` events for PLAN.md

## Step 6 — CLI + Telegram Commands (~80 lines)

**Pi CLI extension** — new `/board` slash command:
```
/board
┌─ Planned (2) ──┬─ In Progress (1) ─┬─ Done (3) ───────┐
│ □ Add auth     │ ▶ Fix login bug    │ ✓ Create API     │
│ □ Write tests  │                    │ ✓ Setup DB       │
│                │                    │ ✓ Todo CRUD      │
└────────────────┴────────────────────┴──────────────────┘
```

**Telegram** — `/board` command returns emoji-formatted summary.

Both read from `GET /board` on Master.

## What Already Exists vs. New

| Exists | New |
|---|---|
| `MessageTracker` — tracks task status + origin | `TaskBoard` — column-based store |
| `MeshEventBus` — can broadcast changes | `board.*` event types |
| `specManager` — can parse PLAN.md | PLAN.md ↔ board sync |
| Browser Daemon WS events | `KanbanBoard.svelte` |
| Telegram `/task` | Telegram `/board` |

## Estimated Total: ~600 lines
