# Harness Comparison Report — AGENTS.md Impact Test

**Date:** 2026-04-15  
**AGENTS.md Variant:** A (none — control)  
**Apps tested:** Vet Appointment App, Home Electricity Consumption App  

## Harnesses Tested

| Harness | Version | CLI Mode | Status |
|---------|---------|----------|--------|
| **Claude Code** | 2.1.109 | `claude -p --dangerously-skip-permissions` | ✅ Completed |
| **Pi** | latest | `pi -p` | ✅ Completed |
| **Codex (OpenAI)** | 0.120.0 | `codex exec --full-auto` | ✅ Completed |
| **Gemini CLI** | 0.38.0 | `gemini -p --yolo` | ❌ Needs GEMINI_API_KEY |
| **Agy (Windsurf)** | 1.107.0 | `agy chat --mode agent` | ❌ GUI-only (not headless) |

---

## Harness Scoreboard (Variant A — No AGENTS.md)

| Harness | Vet App | Elec App | Average | Notes |
|---------|---------|----------|---------|-------|
| **Codex** | **87/100** | **89/100** | **88** | Best code quality, strong DB |
| **Pi** | **87/100** | **88/100** | **87.5** | Best frontend, balanced |
| **Claude Code** | **76/100** | **88/100** | **82** | Vet hit $5 budget cap |

### Detailed Breakdown

#### Vet App

| Dimension (max) | Claude Code | Pi | Codex |
|-----------------|-------------|-----|-------|
| Installability (10) | 10 | 10 | 10 |
| Runnability (15) | 15 | 15 | 15 |
| API Completeness (20) | 12 | 12 | 12 |
| Frontend (10) | 0 | 10 | 10 |
| Code Quality (20) | 16 | 17 | 15 |
| Database (10) | 8 | 8 | 10 |
| Adherence (15) | 15 | 15 | 15 |
| **TOTAL** | **76** | **87** | **87** |

#### Electricity App

| Dimension (max) | Claude Code | Pi | Codex |
|-----------------|-------------|-----|-------|
| Installability (10) | 10 | 10 | 10 |
| Runnability (15) | 15 | 15 | 15 |
| API Completeness (20) | 18 | 18 | 13 |
| Frontend (10) | 10 | 10 | 10 |
| Code Quality (20) | 12 | 12 | 18 |
| Database (10) | 8 | 8 | 8 |
| Adherence (15) | 15 | 15 | 15 |
| **TOTAL** | **88** | **88** | **89** |

---

## Key Findings

### 1. All three harnesses produce working applications
Every completed run: installs, starts, serves API endpoints, and has a frontend. This is impressive — the base quality of all three tools is high.

### 2. 🏆 Codex edges ahead on average (88)
- **Best code quality** (15-18/20): Codex used `uv` for Python, researched SvelteKit conventions via context7 MCP before coding
- **Best DB quality** on vet: proper indexes, clean schema
- **Slightly lower API coverage** on elec (13/20 vs 18/20 for others)
- Took longest to complete (~25 min) due to research/planning phase

### 3. Pi is the most balanced (87.5)
- **Perfect frontend** on both apps (10/10)
- **Strong API completeness** (12/20 vet, 18/20 elec)
- **Fastest to complete** (~10 min per app)
- Consistent quality across both apps

### 4. Claude Code hit budget limits on vet (76)
- **Vet app: 0/10 frontend** — ran out of the $5 budget before building Svelte pages
- **Elec app: excellent** (88/100) — fully completed
- **Highest code quality** on vet backend (16/20) despite incomplete build
- When it completes, quality matches or beats the others

### 5. Structural differences

| Harness | Backend Pattern | Frontend Pattern |
|---------|----------------|-----------------|
| **Claude Code** | Flat: main.py + routers/ dir | SvelteKit scaffold (when built) |
| **Pi** | Package: app/main.py + routers/ | SvelteKit with API lib |
| **Codex** | Package: app/main.py + routers/ + schemas/ | SvelteKit with typed API client |

### 6. API Completeness: similar across harnesses
All three harnesses achieved 8/13 on vet (same endpoints failed: available-slots, some CRUD edge cases). On elec, Claude Code and Pi matched at 15/16 while Codex got 11/16.

---

## Harness vs AGENTS.md Variant Comparison

Combining harness results with the earlier AGENTS.md variant results (which used pi's `worker` subagent internally, similar to Sonnet 4.5):

| Run Type | Avg Score | Best | Worst |
|----------|-----------|------|-------|
| **Codex, no AGENTS.md** | 88 | 89 (elec) | 87 (vet) |
| **Pi CLI, no AGENTS.md** | 87.5 | 88 (elec) | 87 (vet) |
| Pi subagent, A (control) | 84 | 87 (elec) | 81 (vet) |
| Pi subagent, C (quality) | 83 | 83 (both) | 83 (both) |
| **Claude Code, no AGENTS.md** | 82 | 88 (elec) | 76 (vet) |
| Pi subagent, B (speed) | 80.5 | 83 (elec) | 78 (vet) |
| Pi subagent, D (TDD) | 64.5 | 84 (vet) | 45 (elec) |
| Pi subagent, E (adversarial) | 61 | 62 (elec) | 60 (vet) |

### Insight
**The harness matters about as much as the AGENTS.md content.** Switching from Pi subagent to Codex CLI (same no-AGENTS.md) improved score by +4 points. Meanwhile, a bad AGENTS.md (variant E) dropped the score by -23 points.

---

## Blocked Harnesses

### Gemini CLI
- **Issue:** Requires `GEMINI_API_KEY` environment variable
- **Fix:** Set `export GEMINI_API_KEY=<key>` or configure in `~/.gemini/settings.json`
- **Once fixed:** `gemini -p "<prompt>" --yolo` should work headlessly

### Agy (Windsurf/Antigravity)
- **Issue:** GUI-based IDE — `agy chat --mode agent "<prompt>"` sends to the Windsurf window, doesn't run headlessly in terminal
- **Potential fix:** Might need to use Windsurf's API or extension protocol for automation
- **Alternative:** Run manually by opening each run directory as a workspace in Windsurf and pasting the prompt

---

## Files

| File | Description |
|------|-------------|
| `harnesses/*.sh` | Runner scripts for each harness |
| `setup-harness-runs.sh` | Creates isolated directories |
| `launch-harness-runs.sh` | Orchestrates parallel execution |
| `runs/{harness}-{app}-A/` | Built applications |
| `runs/{harness}-{app}-A/auto-score.json` | Automated scores |
| `runs/{harness}-{app}-A/harness.log` | Build log (when available) |

---

*Report generated 2026-04-15*
