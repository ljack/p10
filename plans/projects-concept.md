# Project Concept — Implementation Plan

## Overview
Add multi-project support to P10. Each project is an isolated workspace with its own tasks, pipelines, specs, container, chat history, and mesh events.

## URL Structure
```
/                          → Login / Project list (dashboard)
/projects/:id              → Full workspace for project
/projects/:id/specs        → Deep-link (future)
/projects/:id/pipelines    → Deep-link (future)
```

## Data Model

### User (simple, local-only for now)
```typescript
interface User {
  id: string;           // UUID
  username: string;     // unique
  createdAt: string;
}
```

### Project
```typescript
interface Project {
  id: string;           // UUID
  name: string;
  description?: string;
  ownerId: string;      // User.id
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}
```

## Storage Layout
```
~/.p10/
├── users.json                    # User list
├── projects/
│   ├── {uuid}/
│   │   ├── project.json          # Project metadata
│   │   ├── board.json            # Task board state
│   │   ├── pipelines.json        # Pipeline history
│   │   ├── memory.json           # Board memory/knowledge
│   │   ├── events.json           # Mesh event history (capped)
│   │   ├── chat-history.json     # Chat messages
│   │   ├── container-snapshot/   # WebContainer file snapshot
│   │   └── specs/                # IDEA.md, PRD.md, FSD.md, PLAN.md
│   └── {uuid}/
│       └── ...
```

## Implementation Phases

### Phase 1: Storage Layer (Master Daemon)
**Files**: `p10-master/src/projectStore.ts`, `p10-master/src/userStore.ts`

1. `UserStore` — CRUD for users, persists to `~/.p10/users.json`
   - `create(username)` → User
   - `getByUsername(username)` → User | null
   - `list()` → User[]
   - `delete(id)` → void

2. `ProjectStore` — CRUD for projects, persists to `~/.p10/projects/{id}/project.json`
   - `create(name, ownerId)` → Project
   - `get(id)` → Project | null
   - `listByOwner(ownerId)` → Project[]
   - `update(id, updates)` → Project
   - `archive(id)` → void

3. Refactor existing singletons to be project-scoped:
   - `TaskBoard` → takes `projectId` in constructor, reads/writes from project dir
   - `PipelineStorage` → same
   - `BoardMemory` → same
   - `MeshEventBus` → events tagged with `projectId`

### Phase 2: Master API Endpoints
**File**: `p10-master/src/index.ts`

Auth endpoints:
```
POST /auth/login     { username }     → { user, token? }
POST /auth/logout                     → ok
GET  /auth/me                         → { user }
```

Project endpoints:
```
GET    /projects              → Project[] (for current user)
POST   /projects              → Project  (create)
GET    /projects/:id          → Project
PATCH  /projects/:id          → Project  (update)
DELETE /projects/:id          → ok       (archive)
```

Project-scoped data endpoints (prefix existing with project):
```
GET    /projects/:id/board         → BoardSnapshot
POST   /projects/:id/board/task    → BoardTask
PATCH  /projects/:id/board/task/:taskId → BoardTask
DELETE /projects/:id/board/task/:taskId → ok
GET    /projects/:id/pipelines     → Pipeline[]
POST   /projects/:id/pipelines     → Pipeline (create + execute)
GET    /projects/:id/events        → Event[]
POST   /projects/:id/run           → AutonomousRun
```

Keep legacy un-prefixed endpoints working (default project) for backward compat.

### Phase 3: Browser App — Auth & Routing
**Files**: SvelteKit routes + components

1. Auth flow:
   - `/` checks if user logged in (localStorage `p10_user`)
   - If not → show login form (just username input)
   - If yes → show project list dashboard

2. New routes:
   ```
   src/routes/+page.svelte              → Login or Dashboard
   src/routes/+layout.svelte            → Auth check wrapper
   src/routes/projects/+page.svelte     → Project list
   src/routes/projects/[id]/+page.svelte → Workspace (existing)
   ```

3. Auth store:
   ```typescript
   // src/lib/stores/auth.svelte.ts
   class AuthStore {
     user = $state<User | null>(null);
     login(username: string): Promise<void>;
     logout(): void;
     isLoggedIn: boolean;
   }
   ```

### Phase 4: Browser App — Multi-Container
**File**: `src/lib/sandbox/container.ts`

1. Container manager — map of projectId → WebContainer instance
   ```typescript
   class ContainerManager {
     containers: Map<string, WebContainer>;
     getOrCreate(projectId: string): Promise<WebContainer>;
     snapshot(projectId: string): Promise<void>;  // save to ~/.p10/projects/{id}/container-snapshot/
     restore(projectId: string): Promise<void>;   // load from snapshot
     destroy(projectId: string): void;
   }
   ```

2. Each `/projects/:id` page gets its own container
3. Container snapshots persisted to project dir via master API

### Phase 5: Wire Everything Together
1. Workspace component takes `projectId`, passes to all child components
2. Browser daemon registers with `projectId` scope
3. Mesh events tagged with `{ userId, projectId }`
4. Pi daemon tasks tagged with `{ projectId }`
5. Board, pipelines, chat — all filtered by projectId

## Migration
- Existing `data/board.json` → move to `~/.p10/projects/default/board.json`
- Existing `/tmp/p10-board-memory.json` → move to project dir
- Create "default" project for existing data
- Legacy endpoints proxy to default project

## Test Plan
- `userStore.test.ts` — user CRUD
- `projectStore.test.ts` — project CRUD + isolation
- `board-project-scoped.test.ts` — tasks scoped to project
- `auth-endpoints.test.ts` — login/logout/me
- `project-endpoints.test.ts` — project CRUD API
