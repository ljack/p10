# Board Memory — Progressive Knowledge Compression

> Like LLM memory management: active context stays small, past knowledge gets compressed into
> reflections with paths back to originals. The board never gets overwhelming, but nothing is truly lost.

**Status: 🔨 IN PROGRESS**

## Progress

- [ ] **M1** — Memory data model + file-backed store
- [ ] **M2** — Grooming agent (consolidate → archive → reflect)
- [ ] **M3** — Memory tree API (browse, search, rebirth)
- [ ] **M4** — Board UI: memory indicator + browse panel
- [ ] **M5** — Context injection (new tasks get relevant memories)

## The Problem

A Jira board with 500 tasks is useless. But deleting old tasks loses knowledge.
We need the board equivalent of what LLMs do with attention: keep what's relevant
in the active window, compress the rest, but maintain paths back to the source.

## Memory Tiers (progressive compression)

```
┌─────────────────────────────────────────────────┐
│  ACTIVE BOARD          (full detail, <30 tasks) │
│  planned / in-progress / blocked                │
│  = LLM context window                           │
└──────────────────┬──────────────────────────────┘
                   │ grooming agent moves done/stale tasks
                   ▼
┌─────────────────────────────────────────────────┐
│  ARCHIVE               (full detail, kept N days)│
│  individual completed/failed tasks              │
│  = recent token cache                           │
└──────────────────┬──────────────────────────────┘
                   │ summarize groups by theme/time
                   ▼
┌─────────────────────────────────────────────────┐
│  MEMORY                (compressed summaries)    │
│  "Auth system: built JWT login, registration,   │
│   password reset. 8 tasks over 3 days."         │
│  = KV cache / compressed representation         │
└──────────────────┬──────────────────────────────┘
                   │ distill patterns & learnings
                   ▼
┌─────────────────────────────────────────────────┐
│  REFLECTIONS           (high-level insights)     │
│  "The project uses Express + React. Auth is     │
│   JWT-based. Testing is weak. DB is SQLite."    │
│  = system prompt / persistent knowledge         │
└─────────────────────────────────────────────────┘
```

## Tree / Path Structure

Every piece of knowledge has a path back to its source:

```
Reflection: "Project uses JWT auth with Express backend"
  └─ Memory: "Auth system: 8 tasks, login/register/reset, 3 days"
       ├─ Archive: "Implement JWT login endpoint" (done, 2h, result: ...)
       ├─ Archive: "Add registration with email validation" (done, 1h)
       ├─ Archive: "Password reset flow" (done, 3h)
       └─ ... (5 more archived tasks)
```

Navigation: reflection → memory → archive → (original task data if still exists)

At each level:
- **id** — unique identifier
- **parentId** — link to parent (higher tier)
- **childIds** — links to children (lower tier)  
- **path** — full breadcrumb: `reflection/auth → memory/auth-impl → archive/task-123`
- **summary** — compressed text at this level
- **sourceExists** — whether original data is still available

## Data Model

```typescript
interface MemoryNode {
  id: string;
  tier: 'archive' | 'memory' | 'reflection';
  title: string;
  summary: string;
  parentId?: string;        // link up the tree
  childIds: string[];       // links down the tree
  path: string;             // breadcrumb path
  tags: string[];
  taskCount: number;        // how many original tasks this represents
  timespan: { from: string; to: string };
  createdAt: string;
  sourceExists: boolean;    // can we still navigate to originals?
  metadata?: {
    originalTaskIds?: string[];
    themes?: string[];
    learnings?: string[];
  };
}
```

## Grooming Agent Behavior

Runs periodically (configurable, default: every 5 minutes).

### Phase 1: Archive (board → archive)
- Move `done` tasks older than N minutes (default: 30) to archive tier
- Move `failed` tasks older than N minutes to archive
- Keep board under max size (default: 30 active tasks)
- Preserve full task data in archive

### Phase 2: Consolidate (archive → memory)  
- Group archived tasks by tags/themes/timespan
- When a group has 3+ tasks, create a memory node
- AI summarizes the group into a compact description
- Memory node links back to archived tasks

### Phase 3: Reflect (memory → reflection)
- When 5+ memory nodes exist in similar themes
- AI distills high-level insights/patterns
- Reflection node links back to memory nodes
- Reflections are the "system knowledge" of the project

### Phase 4: Prune
- Archive nodes older than 7 days: remove raw data, keep summary
- Mark `sourceExists: false` on their memory/reflection parents
- Memory nodes older than 30 days: compress further
- Reflections: never auto-deleted, manually managed

## Rebirth / Search

When a new task is added or analyzed:
1. Search reflections for relevance
2. Search memories for related past work
3. If found: inject context into the task analysis
4. Optionally: "rebirth" — recreate a planned task from an archived one

Search is keyword + AI-based relevance matching.

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /board/memory` | All memory nodes (tree view) |
| `GET /board/memory/:id` | Single node + children |
| `GET /board/memory/search?q=auth` | Search across all tiers |
| `GET /board/memory/reflections` | Top-level reflections only |
| `POST /board/memory/rebirth/:id` | Recreate a task from archive |
| `GET /board/memory/context?task=...` | Get relevant memories for a task |

## File Storage

```
/tmp/p10-board-memory.json
{
  "nodes": { ... },
  "reflections": [ ... ],
  "lastGroomed": "2026-04-06T...",
  "stats": { archives: N, memories: N, reflections: N }
}
```
