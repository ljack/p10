# E2E Test Coverage Plan

## Current State
- 6 Playwright specs exist in `svelteapp/tests/` (mesh, board, boot, build-flow, agent, persistence)
- 7 unit tests in `svelteapp/tests/unit/` (security, formatContent, toolParser, etc.)
- All browser-based, require WebContainer boot (~30s)
- No pure API tests for the master daemon (REST + WebSocket)
- No tests for: decomposer, pipeline executor, task queue, activity events,
  auto-scheduler, grooming agent, board persistence, plan sync

## Strategy
Two test layers:
1. **Master API tests** — fast, no browser, test REST endpoints + WebSocket protocol
2. **Playwright integration tests** — existing specs + new pipeline/board UI tests

Focus on layer 1 first — most of the new P10 features are server-side.

## Master API Tests (new: `p10-master/tests/`)

Uses Node.js test runner (built-in, no extra deps). Each test starts a master
on a random port, runs assertions, shuts down.

### Test files:

#### 1. `health.test.ts` — Basic endpoints
- GET /health returns ok
- GET /status returns master info + empty daemons
- GET /tldr returns string

#### 2. `board.test.ts` — Task board CRUD + persistence
- POST /board/task creates task
- GET /board returns board with task
- PATCH /board/task/:id moves task
- DELETE /board/task/:id removes task
- Board persists to disk (restart master, tasks survive)
- Scope field (project vs platform) stored and returned
- Subtasks field stored and returned

#### 3. `pipeline.test.ts` — Pipeline decomposition
- POST /pipeline with simple instruction → decomposes into tasks
- GET /pipeline/:id returns pipeline status
- GET /pipelines returns list
- Plan-driven decomposition from PLAN.md content
- Role assignment heuristic (api/web/review/planning keywords)
- Dependency graph (api before web, review last)
- Fallback: single-task pipeline when LLM unavailable

#### 4. `events.test.ts` — Event bus
- GET /events returns event history
- POST /events/emit creates event
- Events broadcast to connected WebSocket daemons
- Event filtering by pattern

#### 5. `registry.test.ts` — Daemon registry via WebSocket
- Connect WebSocket → register → appears in /status
- Heartbeat keeps daemon alive
- Stale/dead transitions after threshold
- Duplicate name+type dedup on re-register
- Reap after 60s dead

#### 6. `router.test.ts` — Message routing
- Task routed to pi daemon (smart routing)
- Query routed to browser daemon (smart routing)
- Type-name resolution (target='pi' → first alive pi daemon)
- Broadcast to all daemons
- Security: dangerous commands blocked

## Playwright Tests (update existing)

#### 7. Update `mesh.spec.ts`
- Fix: use `-sTCP:LISTEN` in kill commands (not kill clients)
- Add: pipeline progress shows in UI
- Add: board shows pipeline subtasks

#### 8. New `activity.spec.ts`
- Activity events appear in browser when pipeline runs
- Board updates in real-time during pipeline execution

## Implementation Order
1. Set up test infra (`p10-master/tests/`, test runner, helper to start/stop master)
2. `health.test.ts` — smoke test
3. `board.test.ts` — board CRUD + persistence
4. `pipeline.test.ts` — decomposer + pipeline endpoints
5. `events.test.ts` — event bus
6. `registry.test.ts` — WebSocket daemon lifecycle
7. `router.test.ts` — message routing
8. Fix existing Playwright specs

## Test Helper

```typescript
// p10-master/tests/helper.ts
// Starts master on random port, returns { port, url, cleanup }
```

Each test file is independent — starts its own master, no shared state.
