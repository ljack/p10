# Task Board Persistence

## Problem
The task board (`taskBoard.ts`) stores everything in a `Map<string, BoardTask>`.
Every master daemon restart wipes all tasks. Only PLAN.md-synced items survive
because `PlanSync` re-reads the file on boot. All pi-cli and pipeline tasks are lost.

## Goal
Board state survives master restarts. Simple, no external dependencies.

## Design

### Storage: JSON file
- Path: `p10-master/data/board.json`
- Format: `{ tasks: BoardTask[], savedAt: string }`
- Gitignored (runtime state, not source)

### Mutation points (3 total in `taskBoard.ts`)
1. `this.tasks.set(task.id, task)` — in `add()`
2. `this.tasks.delete(taskId)` — in `remove()`
3. `this.tasks.delete(task.id)` — in `pruneCompleted()`

All mutations already flow through `add()`, `move()`, `update()`, `remove()`,
and `pruneCompleted()`. A single `save()` call after each is sufficient.

### Implementation

```
taskBoard.ts changes:

1. Add save/load methods:
   - load(): read board.json → populate this.tasks Map
   - save(): serialize this.tasks Map → write board.json
   - Use sync writes (writeFileSync) — board mutations are infrequent

2. Call save() after every mutation:
   - add()       → save()
   - move()      → save()
   - update()    → save()
   - remove()    → save()
   - pruneCompleted() — already called from move(), no extra save needed

3. Call load() in constructor or new init() method

4. Debounce: not needed — mutations are rare (< 1/sec typical)
```

### PlanSync interaction
- PlanSync runs after board load → adds/updates PLAN.md items on top of persisted state
- No conflict: PlanSync uses `findByTitle()` which works on the loaded Map
- Persisted pi-cli tasks won't collide with PLAN.md tasks (different origins)

### Edge cases
- Corrupt JSON → log warning, start with empty board (don't crash)
- Missing file → normal first boot, start empty
- Concurrent writes → not an issue (single-process master)

## Files to change
1. `p10-master/src/taskBoard.ts` — add load/save, call save after mutations
2. `p10-master/.gitignore` (or project root) — add `data/board.json`
3. `p10-master/data/` — create directory

## Estimated effort
~30 lines of code. One file change + gitignore entry.
