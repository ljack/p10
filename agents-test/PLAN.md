# AGENTS.md Impact Test Framework

## Goal
Measure how different `AGENTS.md` contents affect AI-generated code quality
across two different app builds.

## Test Matrix

| Variant | AGENTS.md Style | Description |
|---------|----------------|-------------|
| **A** | None (control) | No AGENTS.md file at all |
| **B** | Speed | "Be as quick as possible" |
| **C** | Quality Principles | Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven |
| **D** | TDD | Strict test-driven development methodology |
| **E** | Overconstrained | Enterprise patterns, contradictory rules, excessive ceremony |

## Apps Under Test

| App | Description |
|-----|-------------|
| **vet** | Vet appointment system — manage pets, treatments, book appointments |
| **elec** | Home electricity automation — devices, consumption tracking, schedules, budgets |

## Run Matrix (10 total)

```
         A-none  B-speed  C-quality  D-tdd  E-adversarial
vet        ✓       ✓        ✓         ✓          ✓
elec       ✓       ✓        ✓         ✓          ✓
```

## Execution Plan

### Phase 1: Setup (`setup-runs.sh`)
- Create 10 isolated directories under `runs/`
- Copy appropriate AGENTS.md into each
- Each dir is a clean slate

### Phase 2: Build (parallel subagents)
- Launch builds via `subagent` parallel tasks
- Each gets: app spec + its own cwd with AGENTS.md
- Builder agent has full mode (bash + write access)
- Batch: 5 parallel (one app at a time to manage rate limits)

### Phase 3: Score (scorer agent)
- Run `scorer` agent on each completed build
- Scorer reads code, runs install/lint/start checks
- Outputs structured JSON score per rubric
- See `scoring/rubric.md` for dimensions

### Phase 4: Report
- Aggregate scores into comparison matrix
- Generate `results/report.md` with findings

## Directory Structure

```
agents-test/
├── PLAN.md                          ← you are here
├── specs/
│   ├── vet-app.prompt.md            ← full build prompt for vet app
│   └── electricity-app.prompt.md    ← full build prompt for electricity app
├── variants/
│   ├── B-speed-AGENTS.md
│   ├── C-quality-AGENTS.md
│   ├── D-tdd-AGENTS.md
│   └── E-adversarial-AGENTS.md
├── .pi/agents/
│   ├── builder.md                   ← agent that builds an app from spec
│   └── scorer.md                    ← agent that evaluates a built app
├── scoring/
│   └── rubric.md                    ← detailed scoring criteria
├── setup-runs.sh                    ← creates run directories
├── launch.sh                        ← orchestration helper
└── runs/                            ← generated during setup
    ├── vet-A/
    ├── vet-B/
    ├── vet-C/
    ├── vet-D/
    ├── vet-E/
    ├── elec-A/
    ├── elec-B/
    ├── elec-C/
    ├── elec-D/
    └── elec-E/
```

## Dimension 2: Harness Comparison

Testing the same apps with different AI coding harnesses (variant A only):

| Harness | CLI Command | Status |
|---------|------------|--------|
| Claude Code | `claude -p --dangerously-skip-permissions` | ✅ Done |
| Pi | `pi -p` | ✅ Done |
| Codex (OpenAI) | `codex exec --full-auto` | ✅ Done |
| Gemini CLI | `gemini -p --yolo` | ❌ Needs API key |
| Agy (Windsurf) | `agy chat --mode agent` | ❌ GUI-only |

Harness scripts: `harnesses/*.sh`
Setup: `setup-harness-runs.sh`
Launcher: `launch-harness-runs.sh`

## Future Expansion
- [ ] Multiple iterations per variant (statistical significance)
- [ ] More AGENTS.md variants (domain-specific, persona-based)
- [ ] More app types (CLI tools, data pipelines)
- [ ] Gemini CLI (once API key configured)
- [ ] Agy/Windsurf (manual or via extension API)
- [ ] Time-to-completion tracking
- [ ] Cross-variant × cross-harness full matrix (5×5×2 = 50 runs)
