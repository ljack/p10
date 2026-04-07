# New Project — Reset workspace to clean state

## What Gets Reset
1. **WebContainer** — teardown + remount starterFiles (blank React + Express)
2. **IndexedDB snapshot** — clear so old project doesn't restore on reload
3. **Board** — remove project-scoped tasks (keep platform ⚙️ tasks)
4. **Pipeline history** — clear all pipelines
5. **Board memory/archives** — clear project-related (keep platform reflections)
6. **Chat history** — clear browser chat messages

## What Stays
- P10's own PLAN.md (platform roadmap)
- Platform-scoped board tasks (⚙️)
- Master daemon state (registry, event history)
- Pi daemon sessions (stay connected)

## Architecture

```
POST /project/new  (master REST API)
       │
       ├─► Clear project board tasks + pipelines + memory
       ├─► Emit mesh event: project.reset
       │
       ▼
Browser Daemon receives project.reset
       │
       ├─► Clear IndexedDB snapshot
       ├─► resetContainer() + boot() with starterFiles
       ├─► Clear chat messages
       └─► UI shows "New project created"
```

## Endpoints & Commands
- **Master:** `POST /project/new` — clears board/pipelines, emits event
- **Browser:** handles `project.reset` mesh event
- **Pi CLI:** `mesh_new_project` tool + `/new-project` command
- **Telegram:** `/newproject` command

## Implementation Order
1. Master: POST /project/new + board/pipeline/memory cleanup
2. Browser: handle project.reset event (clear IDB + reboot container)
3. Pi CLI: mesh_new_project tool
4. Telegram: /newproject command
