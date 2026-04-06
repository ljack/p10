# Task Creation & AI Analysis — Plan

> Fast task capture from all channels + autonomous AI enrichment + backlog grooming

**Status: 🔨 IN PROGRESS**

## Progress

- [x] **A1** — Quick inline input on web board UI (KanbanBoard.svelte)
- [x] **A2** — Guided `/add` flow: Telegram (3-step: title → description → priority)
- [x] **A3** — Guided `/add` flow: Pi CLI (`mesh_add_task` tool)
- [x] **A4** — Guided `/add` flow: Browser chat (`/add` + `/board` commands)
- [x] **B1** — Task Analyst agent (auto-enriches new human tasks after 10s)
- [x] **B2** — Agent self-created tasks (agents can POST to /board/task with origin: agent)
- [ ] **C1** — Backlog grooming agent (archive to memory, rebirth when relevant)

## Architecture

```
Human enters task (any channel)
    │
    ▼
┌──────────────────┐
│  Board: planned  │ ← minimal: just title
└────────┬─────────┘
         │ 10s delay (configurable)
         ▼
┌──────────────────────────────────┐
│  Task Analyst Agent              │
│  • Rewrites title for clarity    │
│  • Adds questions & ideas        │
│  • Identifies dependencies       │
│  • Tags & categorizes            │
│  • Only for humanCreated tasks   │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Backlog Grooming Agent          │
│  (periodic)                      │
│  • Manages backlog size          │
│  • Archives old → memory         │
│  • Rebirth from memory           │
│  • Hides from current view       │
└──────────────────────────────────┘
```

## A: Quick Task Creation (all channels)

### A1: Web Board UI
- Inline text input at top of "Planned" column
- Enter to submit, just title
- Marks `humanCreated: true` on the task
- Immediately visible on board

### A2–A4: Chat Channel Guided Flow
Step-by-step prompt:
1. "What needs to be done?" → title (required)
2. "Why / more context?" → description (optional, press Enter to skip)
3. "Priority?" → low/normal/high/urgent (default: normal)
4. "Tags?" → optional comma-separated

All channels: Telegram `/add`, Pi CLI `mesh_add_task`, Browser chat `/add`

## B: AI Task Analyst Agent

### B1: Auto-enrichment
- `taskAnalyst.ts` in master daemon
- Watches for new tasks with `humanCreated: true`
- After configurable delay (ANALYSIS_DELAY_MS = 10000), sends task to Pi Daemon
- Pi Daemon analyzes and returns:
  - Rewritten title (clearer, actionable)
  - Questions that need answering
  - Ideas / implementation suggestions  
  - Dependencies on other board tasks
  - Suggested tags
- Writes analysis into task.analysis field
- Emits `board.task.analyzed` event

### B2: Agent self-created tasks
- Agents can POST to /board/task with `origin: { channel: 'agent' }`
- Not auto-analyzed (agents already did the thinking)
- Visible on board with 🤖 icon

## C: Backlog Grooming Agent

- Periodic agent (runs every N minutes, configurable)
- Reviews planned tasks by age, priority, relevance
- Actions:
  - **Archive**: move old/low-priority tasks to `memory` (hidden from main board)
  - **Rebirth**: when a new task relates to archived ones, resurface them
  - **Merge**: detect duplicate/overlapping tasks
  - **Prioritize**: suggest priority changes based on context
- Memory store: separate from active board, searchable, timestamped
- Board endpoint: `GET /board/memory` for archived tasks
