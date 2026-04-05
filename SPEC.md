# P10 — AI-Powered Software Development Platform

> **Codename:** P10
> **Tagline:** _"Spec it by day, ship it by night."_
> **Date:** 2026-04-04

---

## 1. Vision

P10 is a **spec-driven, AI-powered software development platform** that orchestrates specialized agents to build complete applications — APIs, web frontends, and mobile apps — from natural language specifications.

It combines:
- **OpenClaw.ai** — multi-agent orchestration for complex software projects
- **pi-coding-agent** — proven TUI-based coding agent harness
- **Lovable.dev** — instant live preview of what's being built

The core philosophy is the **24-Hour Development Loop**:

```
┌─────────────────────────────────────────────────────────┐
│  ☀️  DAYTIME (Interactive)          🌙 NIGHTTIME (Autonomous)  │
│                                                         │
│  Human + Agent collaborate:        Agents run solo:     │
│  • Explore ideas (MVPs/POCs)       • Code from specs    │
│  • Short sprints & idea checks     • Test against specs │
│  • Refine PRD & FSD                • Results by morning │
│  • Capture guardrails              •                    │
│  • Prepare next autonomous run     •                    │
│                                                         │
│  ◄──── Markdown docs are the contract ────►             │
│  Skills | Ontologies | Plans | Requirements | Tests     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Core Concepts

### 2.1 Harness of Harnesses

P10 is not a single coding agent. It is an **orchestrator** that manages multiple specialized agents working on a shared codebase. Each agent has a focused context window and responsibility.

**Agent Hierarchy:**

```
┌──────────────────────────────────────────────────┐
│                 ORCHESTRATOR AGENT                │
│  (Project-level awareness, task decomposition,   │
│   context routing, conflict resolution)          │
├──────────────┬───────────────┬────────────────────┤
│  API Agent   │  Web Agent    │  Mobile Agent      │
│  ─────────   │  ──────────   │  ─────────────     │
│  • REST/GQL  │  • React/Vue  │  • RN/Flutter/     │
│  • DB schema │  • Styling    │    Expo             │
│  • Auth      │  • State mgmt │  • Native bridges   │
│  • Business  │  • Routing    │  • Platform-specific│
│    logic     │  • Components │                     │
├──────────────┴───────────────┴────────────────────┤
│              CROSS-CUTTING AGENTS                  │
│  • Testing Agent (unit, integration, e2e)          │
│  • DevOps Agent (containers, CI/CD)                │
│  • Review Agent (code quality, security)           │
│  • Spec Agent (PRD/FSD refinement, gap analysis)   │
└───────────────────────────────────────────────────┘
```

**Context Management:**
- Each agent operates with a **focused context** — only the files, specs, and knowledge relevant to its domain
- The Orchestrator handles **context switching** — passing minimal necessary context between agents
- Shared artifacts (API contracts, type definitions, DB schemas) are the **integration points**
- Memory pressure is controlled by **context budgets** per agent

### 2.2 Spec-Driven Development

Everything starts with specifications. The platform supports a **progressive refinement** workflow:

```
Idea → Discussion → PRD → FSD → Implementation Plan → Code → Tests → Deploy
```

**Markdown Documents (MDs) that drive the cycle:**

| Document | Purpose | Phase |
|----------|---------|-------|
| `IDEA.md` | Raw concept, user stories, goals | Discovery |
| `PRD.md` | Product Requirements Document | Planning |
| `FSD.md` | Functional Specification Document | Planning |
| `ARCHITECTURE.md` | System design, tech decisions | Planning |
| `API_CONTRACT.md` | OpenAPI/GraphQL schemas | Planning → Dev |
| `PLAN.md` | Implementation plan, task breakdown | Planning → Dev |
| `SKILLS.md` | Agent skills & capabilities config | Dev |
| `ONTOLOGY.md` | Domain model & terminology | All phases |
| `GUARDRAILS.md` | Constraints, rules, boundaries | All phases |
| `TEST_PLAN.md` | Test strategy, acceptance criteria | Dev → Testing |
| `CHANGELOG.md` | What changed and why | Continuous |

### 2.3 Development Modes

#### 🟢 Interactive Mode (Daytime)
- Human and agents collaborate via **chat**
- Quick iterations: MVPs, POCs, idea validation
- Short sprints with immediate feedback
- Human reviews and refines agent output
- Guardrails are captured and documented
- Specs are created and refined for autonomous runs

#### 🔵 Autonomous Mode (Nighttime / Fire-and-Forget)
- Agents work from **locked specs**
- No human intervention required
- Code is written against the spec
- Tests are run against the spec
- Results, progress report, and issues are ready for review
- Git commits with meaningful messages track all changes

#### 🟡 Hybrid Mode
- Agents work autonomously but can **pause and ask** when blocked
- Notifications sent to human for decisions
- Human can check in anytime and course-correct

---

## 3. Platform Architecture

### 3.1 User Interface

**Primary Interface: Web TUI**
- A terminal-like chat interface rendered in the browser
- Familiar TUI aesthetics (monospace, panels, keyboard-driven)
- But with **rich embedded previews** alongside the chat

**Layout Concept:**

```
┌─────────────────────────────────────────────────────────────┐
│  P10 — Project: jira-clone                    [⚙️] [👤]     │
├────────────────────┬────────────────────────────────────────┤
│                    │                                        │
│   CHAT / TUI       │          PREVIEW PANEL                │
│                    │                                        │
│  > Build auth      │  ┌─ [API] [Web] [Mobile] ──────────┐  │
│    flow with       │  │                                  │  │
│    JWT + refresh   │  │   (Live preview of selected      │  │
│    tokens          │  │    application variant)           │  │
│                    │  │                                  │  │
│  🤖 I'll create:   │  │   Hot-reloads as agent codes     │  │
│  - POST /auth/     │  │                                  │  │
│    login           │  │                                  │  │
│  - POST /auth/     │  │                                  │  │
│    refresh         │  │                                  │  │
│  - middleware...   │  │                                  │  │
│                    │  └──────────────────────────────────┘  │
│  [✓ Approve]       │                                        │
│  [✏️ Edit]          │  ┌─ AGENT ACTIVITY ────────────────┐  │
│  [❌ Reject]        │  │  🟢 API Agent: writing auth      │  │
│                    │  │  ⏸️ Web Agent: waiting for API    │  │
│  > test auth       │  │  ⏸️ Mobile Agent: idle            │  │
│    flow e2e        │  │  🟢 Test Agent: generating tests  │  │
│                    │  └──────────────────────────────────┘  │
├────────────────────┴────────────────────────────────────────┤
│  [Files] [Git Log] [Specs] [Tests] [Agents] [Settings]     │
└─────────────────────────────────────────────────────────────┘
```

**Preview Panel Variants:**

| Tab | What it shows |
|-----|---------------|
| **API** | Live sandbox: endpoint list, request builder, response viewer (Swagger-like + AI-assisted testing) |
| **Web** | Live iframe with hot-reload of the web app |
| **Mobile** | Pluggable: responsive frame, Expo preview, simulator stream, or device mirror |

**Key UI Principles:**
- Chat is the primary interaction — everything can be done from chat
- Preview is always visible — you see what's being built as it happens
- Agent activity is transparent — see which agents are working and on what
- Bottom bar provides quick access to project artifacts

### 3.2 Preview System

**API Preview:**
- Sandboxed backend running in a container/process
- Auto-generated endpoint documentation from code
- Interactive request builder (like Postman/Swagger UI)
- AI-assisted testing: "test auth flow e2e" → agent crafts and runs test sequences
- Response inspection, timing, error analysis

**Web Preview:**
- Sandboxed dev server (Vite/Next.js/etc.)
- Hot-reload iframe embedded in the platform
- Real-time updates as the agent writes code
- Can be paused during large refactors to avoid noise
- CSS/layout debugging overlay

**Mobile Preview (Extensible/Plugin-based):**
- **Option A:** Responsive web frame (simplest, works for React Native Web / PWA)
- **Option B:** Expo Snack-like preview (for React Native / Expo)
- **Option C:** Simulator stream (iOS Simulator / Android Emulator via WebRTC/VNC)
- **Option D:** Device mirror (physical device via USB/WiFi)
- Plugin architecture allows adding new preview methods

**Preview Control:**
- ▶️ **Live** — updates in real-time as agent codes
- ⏸️ **Paused** — frozen at last stable state (for big refactors)
- 📸 **Snapshot** — compare before/after a change
- Resource-aware: automatically pauses preview if system is under memory/CPU pressure

### 3.3 Git Integration

Git is the **source of truth** for all project files, mostly operating behind the scenes.

**How git is used:**
- Every meaningful agent action = a git commit with a descriptive message
- Commits are grouped by task/feature (logical units, not every file save)
- Branch-per-feature when multiple agents work in parallel (auto-merged)
- The Orchestrator manages merge conflicts between agent branches

**User-facing git features:**
- **Rollback** — "undo last change" or "rollback to before auth refactor" via chat or UI button
- **History** — browseable git log in the bottom panel
- **External editing** — user can edit files in VS Code, commit & push → P10 detects changes and syncs state
- **Two-way sync** — P10 watches the git repo; external pushes are incorporated

**What's NOT exposed (initially):**
- Manual branching/merging UI
- PR/review workflows (later, for team collaboration)
- CI/CD pipeline management

### 3.4 AI / Model Support

**Model Providers:**
- Cloud models via API keys: OpenAI, Anthropic, Google, etc.
- Cloud models via subscriptions: OpenRouter, etc.
- Local models via Ollama, LM Studio, or compatible OpenAI-format APIs

**Model Routing:**
- Different agents can use different models (e.g., heavy planning → Claude, quick code gen → local model)
- Cost-aware routing: use cheaper/faster models for simple tasks
- Fallback chains: if one provider is down, try another

**Configuration:**
```yaml
models:
  orchestrator: claude-sonnet-4  # needs strong reasoning
  api_agent: claude-sonnet-4
  web_agent: claude-sonnet-4
  mobile_agent: claude-sonnet-4
  test_agent: gpt-4o            # good at test generation
  review_agent: local/llama3    # cost-saving for reviews
  spec_agent: claude-sonnet-4   # needs strong writing
```

---

## 4. Development Phases & Workflow

### Phase 1: Discovery (Interactive)

```
User: "I want to build a Jira clone"

Platform: Let's explore that. I'll ask some questions to understand the scope.

- What's the target audience?
- Which Jira features are must-have for MVP?
- Any tech preferences?
- ... (guided conversation)

→ Output: IDEA.md (captured concept)
```

### Phase 2: Planning (Interactive)

```
User: "Let's plan this out"

Platform: Based on IDEA.md, I'll draft the PRD.

→ Generates: PRD.md (product requirements)
→ Discussion: User refines requirements
→ Generates: FSD.md (functional spec)
→ Generates: ARCHITECTURE.md (system design)
→ Generates: API_CONTRACT.md (endpoint definitions)
→ Generates: PLAN.md (implementation tasks, ordered, estimated)
```

**The user can iterate** — "add Kanban board view", "remove time tracking for MVP", etc.

### Phase 3: Development (Interactive → Autonomous)

**Interactive sub-phase:**
```
User: "Let's start with the auth module"

→ API Agent builds auth endpoints
→ Web Agent builds login/register UI
→ Preview shows working auth flow
→ User tests, gives feedback
→ Iterate until happy
```

**Autonomous sub-phase:**
```
User: "Specs are ready. Build the rest overnight."

→ Orchestrator decomposes PLAN.md into agent tasks
→ Agents work through tasks in dependency order
→ Each task: code → test → commit
→ Morning: progress report ready
    ✅ 14/20 tasks complete
    ⚠️ 3 tasks need human input
    ❌ 3 tasks failed (with error details)
```

### Phase 4: Testing (Interactive + Autonomous)

```
User: "Test the whole app"

→ Test Agent generates/runs unit tests
→ Test Agent generates/runs integration tests
→ Test Agent runs e2e tests (AI-driven: "test full auth flow")
→ Results displayed with coverage metrics
→ Failed tests → agent attempts fixes → re-runs
```

### Phase 5: Packaging (Later)

- Container packaging (Dockerfile generation)
- Supabase-style backend deployment
- Static hosting for web frontend
- App store builds for mobile

---

## 5. Multi-Agent Collaboration

### 5.1 Orchestrator Responsibilities

The Orchestrator is the **brain** of the system:

1. **Task Decomposition** — breaks specs into agent-assignable tasks
2. **Dependency Resolution** — orders tasks (API before frontend)
3. **Context Routing** — gives each agent only what it needs
4. **Conflict Resolution** — handles merge conflicts, design conflicts
5. **Progress Tracking** — maintains overall project state
6. **Quality Gates** — ensures each task meets acceptance criteria before moving on
7. **Human Escalation** — knows when to ask the human

### 5.2 Agent Communication

Agents don't talk to each other directly. They communicate through:

1. **Shared Artifacts** — API contracts, type definitions, DB schemas in git
2. **The Orchestrator** — routes relevant information between agents
3. **Event Bus** — "API contract changed" → triggers Web Agent to update API calls

```
API Agent finishes POST /auth/login
  → commits code + updates API_CONTRACT.md
  → Orchestrator notifies Web Agent
  → Web Agent reads new API contract
  → Web Agent builds login form calling POST /auth/login
  → Both previews update
```

### 5.3 Context Budget Management

Each agent has a **context budget** to control memory pressure:

- **Working context** — current task files + relevant specs (~30% of window)
- **Reference context** — API contracts, types, shared models (~20% of window)
- **Conversation history** — compressed summaries of past interactions (~10% of window)
- **Available for output** — room for code generation (~40% of window)

The Orchestrator manages context rotation — swapping in/out files as agents move between tasks.

---

## 6. External Tool Integration

### 6.1 Two-Way Code Sync

Users can edit code outside P10 (VS Code, JetBrains, vim, etc.):

```
User edits files in VS Code → git commit → git push
  → P10 detects new commits
  → Updates internal state
  → Re-runs affected previews
  → Notifies agents of external changes
```

```
Agent writes code in P10 → git commit
  → User pulls in VS Code
  → Sees latest changes
```

### 6.2 Plugin / Extension Points

The platform should be extensible at multiple levels:

| Extension Point | Examples |
|----------------|----------|
| **Preview plugins** | New mobile preview methods, AR/VR preview, PDF preview |
| **Agent plugins** | Custom agents for specific domains (ML pipelines, game dev) |
| **Model plugins** | New model providers, fine-tuned models |
| **Tool plugins** | Integration with external services (Figma, databases, APIs) |
| **Template plugins** | Project starters (SaaS boilerplate, e-commerce, etc.) |

---

## 7. MVP Roadmap

### MVP 0: Foundation (The Smallest Useful Thing)

**Goal:** Single-agent coding platform with live web preview

- [ ] Web TUI interface (chat panel + preview panel)
- [ ] Single coding agent (like pi, but in browser)
- [ ] Web app preview (iframe with hot-reload)
- [ ] Git backend (auto-commits)
- [ ] One model provider (Anthropic API key)
- [ ] Basic project scaffolding ("create a React app")

**Demo:** "Build a todo app" → chat with agent → see todo app in preview

---

### MVP 1: Multi-Preview

**Goal:** Add API and mobile preview

- [ ] API preview panel (endpoint list + request builder)
- [ ] Sandboxed backend execution
- [ ] Mobile preview (responsive frame at minimum)
- [ ] Preview switching (API / Web / Mobile tabs)
- [ ] Preview pause/resume

**Demo:** "Build a notes app with API" → see both API docs and web app

---

### MVP 2: Spec-Driven Workflow

**Goal:** Structured planning before coding

- [ ] Discovery phase (guided conversation → IDEA.md)
- [ ] Planning phase (PRD.md, FSD.md, PLAN.md generation)
- [ ] Spec review & refinement workflow
- [ ] Plan-to-tasks breakdown
- [ ] Task tracking in UI

**Demo:** "I want to build a Jira clone" → full spec generated → reviewed → approved

---

### MVP 3: Multi-Agent

**Goal:** Specialized agents working together

- [ ] Orchestrator agent
- [ ] Separate API agent + Web agent
- [ ] Agent activity panel in UI
- [ ] Context routing between agents
- [ ] Shared artifact management (API contracts)
- [ ] Agent-to-agent coordination via Orchestrator

**Demo:** "Build auth" → API agent builds endpoints, Web agent builds UI, both previews update

---

### MVP 4: Autonomous Mode

**Goal:** Fire-and-forget development runs

- [ ] Lock specs for autonomous run
- [ ] Unattended task execution pipeline
- [ ] Progress tracking & reporting
- [ ] Error handling & retry logic
- [ ] Morning report generation
- [ ] Pause/resume autonomous runs

**Demo:** Approve spec → leave → come back to working app with progress report

---

### MVP 5: Collaboration & Polish

**Goal:** External editing, multi-model, production readiness

- [ ] Two-way git sync (external editor support)
- [ ] Multiple model provider support (cloud + local)
- [ ] Model routing per agent
- [ ] Rollback via chat ("undo that")
- [ ] AI-assisted testing ("test auth flow e2e")
- [ ] Container packaging

---

### MVP 6: API-First Development

**Goal:** OpenAPI spec as the contract between agents, API Explorer as Swagger UI

- [ ] Agent generates `openapi.yaml` during Planning phase (FSD.md)
- [ ] API Explorer renders OpenAPI spec as interactive docs
- [ ] Backend agent implements endpoints to match the spec
- [ ] Frontend agent reads spec to generate API client calls
- [ ] Validation: verify implementation matches the spec
- [ ] Auto-generate request/response examples from schemas
- [ ] OpenAPI spec becomes shared artifact for multi-agent coordination

### Future (Post-MVP)

- Team collaboration (multiple humans)
- SaaS hosting
- Deployment pipeline
- Marketplace for templates/plugins/agents
- Fine-tuned models for specific agent roles
- Mobile preview plugins (Expo, simulators)
- Figma-to-code integration
- Cost tracking & optimization dashboard

---

## 8. Key Design Principles

1. **Specs are the contract** — Markdown documents drive everything. They are human-readable, version-controlled, and machine-actionable.

2. **Chat-first, always** — Every action can be performed via chat. UI buttons are shortcuts, not requirements.

3. **Transparency** — The user always knows what agents are doing, why, and can intervene.

4. **Progressive autonomy** — Start interactive, earn trust, go autonomous. The human decides the level of control.

5. **Resource-aware** — The system manages its own CPU/memory/token budget. Pauses when needed, routes to cheaper models when appropriate.

6. **Extensible** — Plugin architecture at every level. No hard-coded assumptions about frameworks, languages, or tools.

7. **Git-native** — Everything is in git. You can always escape to standard tools.

8. **Fail gracefully** — When an agent is stuck, it stops and asks. It doesn't hallucinate solutions to spec-violating corners.

---

## 9. Open Questions

- [ ] **Tech stack** for the platform itself — TBD (next discussion)
- [x] **Sandboxing strategy** — **WebContainers** (StackBlitz) for in-browser sandboxing
- [ ] **Session persistence** — how to save/restore agent state between sessions?
- [ ] **Pricing model** — if/when going SaaS, how to charge? Per agent-minute? Per project?
- [ ] **Security** — running user-specified code in sandboxes, API key management
- [ ] **Offline support** — can the platform work fully offline with local models?
- [ ] **Project templates** — what starter templates to ship with?
- [ ] **Max project complexity** — what's the ceiling? Microservices? Monorepo? How many agents can run in parallel?
