# Pipeline Improvements: Plan-driven Decomposition + Parallel Execution

## Current State
- `decomposeFromPlan()` is a stub that returns empty array
- `decomposeWithLLM()` works but is expensive (creates a full agent session)
- All pipeline tasks run strictly sequentially (even independent ones)
- Dependencies are linear chains (each task depends on the previous)

## Improvements

### 1. Plan-driven decomposition from PLAN.md
Read PLAN.md unchecked items, assign roles by content analysis, create pipeline.

**Role assignment heuristic (no LLM needed):**
- Contains "API", "endpoint", "route", "backend", "server", "database" → api_agent
- Contains "component", "UI", "form", "page", "frontend", "style", "CSS" → web_agent
- Contains "test", "verify", "check", "review", "fix" → review_agent
- Default or "plan", "spec", "design", "architecture" → planning_agent

**Dependency logic:**
- api_agent tasks before web_agent tasks (backend first)
- review_agent tasks after everything else
- Tasks within the same role: sequential (same session)
- Tasks across independent roles: could be parallel (future)

### 2. Smarter dependency graph
Instead of linear chains, build a DAG:
- api_agent tasks: chain among themselves
- web_agent tasks: chain among themselves, depend on last api_agent task
- review_agent: depends on all other tasks
- planning_agent: no dependencies (runs first)

This enables parallel execution when we have multiple pi daemons,
but even with one daemon the ordering is smarter (all API before all web).

### 3. Better error handling in decomposer
- Catch LLM session creation failures gracefully
- Fallback: if LLM decomposition fails, create single-task pipeline
- Timeout for decomposition (don't hang if LLM is slow)

## Implementation
All changes in `p10-master/src/decomposer.ts`. No executor changes needed
for v1 — the executor already handles dependencies.
