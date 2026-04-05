# P10 — Tech Stack & Execution Plan

> Decisions made, rationale explained, MVP 0 focus.

---

## 1. Tech Stack

### 1.1 Frontend (The Web TUI)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | **Next.js 15 (App Router)** | Full-stack React, API routes for backend, great DX, SSR for initial load |
| **UI / Web TUI** | **xterm.js + custom React panels** | xterm.js gives real terminal feel for the chat; custom React components for preview panels, tabs, agent status |
| **Styling** | **Tailwind CSS** | Fast iteration, easy to build terminal-aesthetic theme |
| **State** | **Zustand** | Lightweight, no boilerplate, good for complex cross-panel state |
| **Real-time** | **WebSocket (native or socket.io)** | Agent output streaming, preview sync, git events |

**Why xterm.js for chat?**
- Authentic terminal feel (the "Web TUI" concept)
- Keyboard-driven, supports ANSI colors, fast rendering
- Users who like `pi` will feel at home
- Custom key bindings, command palette feel

**Alternative considered:** Full custom React terminal — more control but much more work. We can start with xterm.js and replace later if needed.

### 1.2 Sandboxing & Preview

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Code execution** | **WebContainers (@webcontainer/api)** | In-browser Node.js runtime. No server needed for sandboxing. Instant boot. |
| **Web preview** | **iframe pointing to WebContainer dev server** | WebContainer runs Vite/Next → serves on localhost-like URL → iframe renders it |
| **API preview** | **WebContainer running backend + Swagger UI component** | Backend runs in WebContainer, custom API explorer panel reads OpenAPI spec |
| **Mobile preview** | **Responsive iframe wrapper** (MVP 0-1), plugins later | Simplest start: wrap web preview in phone-shaped frame |

**WebContainers key facts:**
- Runs Node.js, npm, Vite, etc. **in the browser** (no Docker needed)
- File system API: read/write files programmatically
- Process API: run commands, stream stdout/stderr
- Limitations: Node.js only (no Python/Go/Rust backends in MVP), no native binaries
- Works in Chrome, Edge, Firefox (with some limits), not Safari

**Implication:** MVP backends must be Node.js (Express/Fastify/Hono). This is fine for MVP. For production, we add Docker-based sandboxing as an alternative later.

### 1.3 AI Integration

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **LLM Client** | **Vercel AI SDK (`ai` package)** | Unified API for multiple providers, streaming, tool calling, great Next.js integration |
| **Default model** | **Anthropic Claude Sonnet** | Strong coding, good at following specs |
| **Model config** | **User provides API key** (self-hosted) | No cost to us for MVP, user controls spending |
| **Agent framework** | **Custom (inspired by pi)** | Simple agent loop: prompt → tool calls → execute → observe → repeat |

**Agent tool set (MVP 0):**

| Tool | Purpose |
|------|---------|
| `read_file` | Read file from WebContainer FS |
| `write_file` | Write/create file in WebContainer FS |
| `execute_command` | Run shell command in WebContainer (npm install, etc.) |
| `list_files` | List directory contents |
| `search_files` | Grep/search across project |
| `preview_status` | Check if dev server is running, get URL |

### 1.4 Git Integration

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Git engine** | **isomorphic-git** | Pure JS git implementation, works in browser with WebContainers |
| **Storage** | **WebContainer FS + browser (MVP)**, remote repo later | Git repo lives in the WebContainer; can clone/push to GitHub later |
| **Commit strategy** | **Agent commits after each completed task** | Meaningful atomic commits |

### 1.5 Persistence

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Project state** | **IndexedDB (via idb)** | Persist project files, chat history, settings across browser sessions |
| **Settings/keys** | **localStorage (encrypted)** | API keys stored locally, never sent to our server |
| **Future** | **Supabase or SQLite (when going SaaS)** | User accounts, project sharing, cloud persistence |

---

## 2. Project Structure

```
p10/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing / project picker
│   ├── project/
│   │   └── [id]/
│   │       └── page.tsx          # Main workspace (chat + preview)
│   └── api/
│       ├── chat/
│       │   └── route.ts          # AI chat endpoint (streaming)
│       └── models/
│           └── route.ts          # Model provider proxy
│
├── components/
│   ├── workspace/
│   │   ├── Workspace.tsx         # Main layout: chat + preview + status
│   │   ├── ChatPanel.tsx         # xterm.js based chat terminal
│   │   ├── PreviewPanel.tsx      # Preview container with tabs
│   │   ├── AgentStatus.tsx       # Agent activity indicator
│   │   └── BottomBar.tsx         # Files, Git, Specs, Settings tabs
│   ├── preview/
│   │   ├── WebPreview.tsx        # iframe for web app
│   │   ├── ApiPreview.tsx        # API explorer (endpoint list + tester)
│   │   ├── MobilePreview.tsx     # Responsive phone frame
│   │   └── PreviewControls.tsx   # Play/pause/snapshot
│   ├── chat/
│   │   ├── ChatTerminal.tsx      # xterm.js wrapper
│   │   ├── MessageRenderer.tsx   # Render agent messages (markdown, code)
│   │   └── InputHandler.tsx      # User input, command parsing
│   └── common/
│       ├── Panel.tsx             # Resizable panel component
│       └── Theme.tsx             # Terminal color theme
│
├── lib/
│   ├── agent/
│   │   ├── Agent.ts              # Core agent loop
│   │   ├── tools.ts              # Tool definitions & executors
│   │   ├── prompts.ts            # System prompts
│   │   └── context.ts            # Context window management
│   ├── sandbox/
│   │   ├── WebContainerManager.ts # WebContainer lifecycle
│   │   ├── FileSystem.ts         # FS operations abstraction
│   │   └── ProcessManager.ts     # Run commands, stream output
│   ├── git/
│   │   ├── GitManager.ts         # isomorphic-git wrapper
│   │   └── commitStrategy.ts     # When/how to commit
│   ├── preview/
│   │   ├── PreviewManager.ts     # Manage dev servers, URLs
│   │   └── devServer.ts          # Start/stop/restart dev server
│   ├── models/
│   │   ├── provider.ts           # Model provider abstraction
│   │   ├── anthropic.ts          # Anthropic integration
│   │   └── openai.ts             # OpenAI integration
│   ├── project/
│   │   ├── ProjectManager.ts     # Project CRUD, persistence
│   │   └── templates.ts          # Project templates (React, etc.)
│   └── store/
│       ├── projectStore.ts       # Zustand store for project state
│       ├── chatStore.ts          # Chat history store
│       └── settingsStore.ts      # User settings, API keys
│
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## 3. MVP 0 Execution Plan

### Goal
> Single-agent coding platform with live web preview.
> **Demo:** "Build a todo app" → chat with agent → see todo app appear in preview.

### Sprint 0: Skeleton (Day 1-2)

- [ ] Initialize Next.js 15 project with TypeScript, Tailwind
- [ ] Set up project structure (folders above)
- [ ] Basic workspace layout: two-panel (chat left, preview right)
- [ ] Resizable panels with drag handle
- [ ] Terminal color theme (dark, monospace, green-on-black vibes)

**Deliverable:** Empty workspace shell with two panels rendered.

### Sprint 1: WebContainer Integration (Day 2-3)

- [ ] Install `@webcontainer/api`
- [ ] `WebContainerManager` — boot, mount files, run commands
- [ ] `FileSystem` — read/write/list/search files in container
- [ ] `ProcessManager` — spawn processes, stream stdout/stderr
- [ ] Template: scaffold a basic Vite + React project on boot
- [ ] Verify: `npm install && npm run dev` works in WebContainer

**Deliverable:** WebContainer boots, installs deps, runs Vite dev server.

### Sprint 2: Live Preview (Day 3-4)

- [ ] `PreviewManager` — detect dev server URL, manage lifecycle
- [ ] `WebPreview` component — iframe pointing to WebContainer server
- [ ] Auto-restart on crash
- [ ] Preview controls: loading state, refresh button
- [ ] Hot-reload works: edit a file via API → preview updates

**Deliverable:** See a running React app in the preview iframe.

### Sprint 3: Chat Terminal (Day 4-5)

- [ ] Install xterm.js + xterm-addon-fit
- [ ] `ChatTerminal` — render xterm.js in React
- [ ] Input handling: user types, presses Enter → sends message
- [ ] Output rendering: agent responses streamed character-by-character
- [ ] Markdown-ish formatting in terminal (bold, colors, code blocks)
- [ ] Auto-scroll, history navigation (up/down arrows)

**Deliverable:** Working chat terminal where you can type messages.

### Sprint 4: AI Agent (Day 5-7)

- [ ] API route for chat (streaming via Vercel AI SDK)
- [ ] `Agent` class — core loop: receive message → plan → call tools → respond
- [ ] System prompt: "You are a coding assistant. You build web apps. You have these tools..."
- [ ] Tool implementations:
  - [ ] `read_file` — read from WebContainer FS
  - [ ] `write_file` — write to WebContainer FS
  - [ ] `execute_command` — run command in WebContainer
  - [ ] `list_files` — list directory
  - [ ] `search_files` — grep files
- [ ] Tool call rendering in chat (show what tool was called, result summary)
- [ ] Stream agent reasoning + actions to chat terminal

**Deliverable:** Agent can receive "create a component" → writes files → preview updates.

### Sprint 5: Git Integration (Day 7-8)

- [ ] Install isomorphic-git
- [ ] `GitManager` — init repo, stage, commit
- [ ] Auto-commit after agent completes a task
- [ ] Commit messages generated by agent
- [ ] Basic git log viewer in bottom panel
- [ ] Rollback: "undo last change" → git revert → preview updates

**Deliverable:** Git tracks all changes, can rollback.

### Sprint 6: Settings & Persistence (Day 8-9)

- [ ] Settings panel: API key input (Anthropic)
- [ ] Model selection dropdown
- [ ] Project persistence (IndexedDB)
- [ ] Restore project state on page reload
- [ ] New project / open project picker

**Deliverable:** Settings saved, projects persist across sessions.

### Sprint 7: Polish & Demo (Day 9-10)

- [ ] Error handling throughout (agent errors, WebContainer crashes, network issues)
- [ ] Loading states and progress indicators
- [ ] Agent status indicator (thinking, writing, executing...)
- [ ] Keyboard shortcuts (focus chat, refresh preview, etc.)
- [ ] **Full demo run:** "Build a todo app with add, complete, delete"
- [ ] Record demo / write README

**Deliverable:** Complete MVP 0, demo-ready.

---

## 4. Key Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **WebContainer limitations** | Can't run everything (no native binaries, Node.js only) | Acceptable for MVP. Add Docker sandbox option later. |
| **WebContainer browser support** | No Safari, some Firefox issues | Document supported browsers. This is MVP, not GA. |
| **xterm.js + React complexity** | xterm.js is imperative, React is declarative — integration can be tricky | Wrap in clean React component, use refs, keep interface thin |
| **Agent quality** | LLM may produce bad code that doesn't run | Good system prompt, error recovery loop (run → error → fix → retry) |
| **Token costs** | Users might burn through API credits fast | Show token usage, warn on large operations, support cheaper models |
| **Preview performance** | WebContainer + iframe + xterm.js all in one page | Lazy-load previews, pause when not visible, monitor memory |

---

## 5. Dependencies (npm packages)

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@webcontainer/api": "^1",
    "@xterm/xterm": "^5",
    "@xterm/addon-fit": "^0.10",
    "ai": "^4",
    "@ai-sdk/anthropic": "^1",
    "@ai-sdk/openai": "^1",
    "isomorphic-git": "^1",
    "zustand": "^5",
    "idb": "^8",
    "tailwindcss": "^4",
    "react-resizable-panels": "^2"
  }
}
```

---

## 6. Decision Log

| # | Decision | Date | Rationale |
|---|----------|------|-----------|
| 1 | WebContainers for sandboxing | 2026-04-04 | In-browser, no infra needed, instant boot |
| 2 | ~~Next.js 15~~ → **SvelteKit** | 2026-04-05 | Next.js 16 Turbopack has source-map infinite loop bug (doQuickSort blocks event loop at 100%+ CPU). SvelteKit + Vite is stable, 0% idle CPU, instant HMR |
| 3 | ~~xterm.js~~ → Custom Svelte chat | 2026-04-05 | Svelte reactivity is simpler, xterm.js not needed for MVP |
| 4 | Vercel AI SDK for LLM | 2026-04-04 | Multi-provider, streaming, tool calling built-in |
| 5 | isomorphic-git for version control | 2026-04-04 | Pure JS, works in browser alongside WebContainers |
| 6 | Start with todo app demo | 2026-04-04 | Simplest proof, covers full read-write-preview loop |
| 7 | Self-hosted first | 2026-04-04 | User brings API key, no backend costs |
| 8 | Node.js backends only (MVP) | 2026-04-04 | WebContainer limitation, fine for MVP scope |
