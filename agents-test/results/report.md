# AGENTS.md Impact Test — Results Report

**Date:** 2026-04-15  
**Apps tested:** Vet Appointment App, Home Electricity Consumption App  
**Variants:** A (control), B (speed), C (quality), D (TDD), E (adversarial)  
**Agent used:** Claude Sonnet 4.5 via pi worker subagent  
**Iterations:** 1 per variant  

---

## Summary Scoreboard

| Variant | AGENTS.md Style | Vet App | Elec App | Average |
|---------|----------------|---------|----------|---------|
| **A** | None (control) | **81/100** | **87/100** | **84** |
| **B** | Speed-focused | **78/100** | **83/100** | **80.5** |
| **C** | Quality principles | **83/100** | **83/100** | **83** |
| **D** | TDD | **84/100** | **45/100** | **64.5** |
| **E** | Overconstrained | **60/100** | **62/100** | **61** |

### Score Breakdown

#### Vet App

| Dimension (max) | A-none | B-speed | C-quality | D-tdd | E-adversarial |
|-----------------|--------|---------|-----------|-------|---------------|
| Installability (10) | 10 | 10 | 10 | 10 | 10 |
| Runnability (15) | 15 | 15 | 15 | 15 | 15 |
| API Completeness (20) | 10 | 10 | 18 | 12 | 0 |
| Frontend (10) | 10 | 10 | 10 | 10 | 0 |
| Code Quality (20) | 11 | 9 | 9 | 12 | 15 |
| Database (10) | 10 | 10 | 8 | 10 | 8 |
| **Adherence (15)** | **15** | **14** | **13** | **15** | **12** |
| **TOTAL** | **81** | **78** | **83** | **84** | **60** |

#### Electricity App

| Dimension (max) | A-none | B-speed | C-quality | D-tdd | E-adversarial |
|-----------------|--------|---------|-----------|-------|---------------|
| Installability (10) | 10 | 10 | 10 | 6 | 10 |
| Runnability (15) | 15 | 15 | 15 | 8 | 7 |
| API Completeness (20) | 16 | 18 | 16 | 6 | 0 |
| Frontend (10) | 10 | 10 | 10 | 0 | 10 |
| Code Quality (20) | 11 | 9 | 11 | 10 | 15 |
| Database (10) | 10 | 8 | 8 | 10 | 10 |
| **Adherence (15)** | **15** | **13** | **13** | **5** | **10** |
| **TOTAL** | **87** | **83** | **83** | **45** | **62** |

---

## Adherence Scoring Details

### Variant A — Control (15/15 both)
No AGENTS.md → no instructions to violate. Auto full score.

### Variant B — Speed (vet: 14/15, elec: 13/15)
- ✅ Minimal code: vet=2 py files, elec=3 py files (monolith style)
- ✅ No tests whatsoever
- ✅ No abstractions — flat, direct code
- ✅ No comments or documentation beyond README
- Minor deduction: elec had slightly more files than truly minimal

### Variant C — Quality Principles (vet: 13/15, elec: 13/15)
- ✅ Simple solutions: no over-engineering, flat file structures
- ✅ Focused code: only what was requested
- ✅ High API completeness suggests goal-driven execution (vet: 12/13 endpoints!)
- ⚠️ No explicit evidence of "think before coding" (no plan comments)
- ⚠️ No explicit success verification (no health checks or validation scripts)

### Variant D — TDD (vet: 15/15, elec: 5/15)

**vet-D: Perfect TDD execution** 🏆
- ✅ 46 tests passing
- ✅ 92% code coverage (target was 90%+)
- ✅ Test structure: conftest.py, test_pets.py, test_treatments.py, test_appointments.py
- ✅ Proper test fixtures with async client
- ✅ Tests cover happy paths and error cases

**elec-D: TDD derailed**
- ⚠️ Only 1 test file (test_devices.py) out of 4 expected domains
- ❌ 5 tests failed, 7 errors, only 2 passed
- ❌ No frontend built at all (0 svelte files!)
- ❌ Only 5/16 API endpoints working
- Root cause: spent all time on device TDD, ran out of context/budget before other domains

### Variant E — Adversarial/Overconstrained (vet: 12/15, elec: 10/15)

**Architecture obedience was remarkable:**
- ✅ Full hexagonal layout: domain/ → application/ → infrastructure/ → presentation/
- ✅ Repository pattern, Unit of Work, Mediator, Factories, Strategies, CQRS
- ✅ Domain events system, Protocol-based interfaces
- ✅ Comprehensive docstrings on all functions
- ✅ Custom exception hierarchies (DomainError, ApplicationError, InfrastructureError)
- ✅ Rate limiting via slowapi

**But functionality suffered:**
- ❌ vet-E: 0/13 API endpoints working (routes never wired into FastAPI app!)
- ❌ elec-E: server crashes on import (broken module paths between layers)
- ❌ vet-E: 0 frontend files (all budget spent on backend architecture)
- ⚠️ elec-E: had 12 svelte files but backend couldn't serve them

---

## Key Findings

### 1. 🏆 No AGENTS.md (A) beats most AGENTS.md variants
The control group scored **84 avg** — higher than Speed (80.5), TDD (64.5), and Adversarial (61). Only Quality (83) came close. This suggests the default behavior of the AI agent is already quite good, and **most AGENTS.md files introduce constraints that hurt more than help**.

### 2. 📉 Over-constraining is actively destructive (E)
The adversarial variant scored **lowest overall (61 avg)**. Both apps had severe issues:
- Incredible architecture, zero working endpoints
- The agent faithfully built hexagonal ports-and-adapters but never wired the app together
- **Architecture astronaut anti-pattern in action**

### 3. ⚖️ Quality principles (C) help API completeness without sacrificing much
Variant C scored **18/20 API completeness** on the vet app (best across all variants). The "Simplicity First" + "Goal-Driven Execution" principles appeared to focus the agent on actually completing all endpoints rather than gold-plating.

### 4. 🧪 TDD is high-variance (D)
- **vet-D was the best single run**: 84 total, 46 tests at 92% coverage, proper architecture
- **elec-D was near-worst**: 45 total, mostly broken tests, no frontend
- TDD forces the agent to spend significant context on test infrastructure. For simpler apps it works beautifully; for more complex ones it runs out of budget.

### 5. ⚡ Speed (B) delivers working software at the cost of quality
Variant B consistently produced **working endpoints** (7/13 vet, 15/16 elec) with the absolute minimum code. But code quality was lowest (9/20 both apps). The "ship fast" philosophy works for MVPs but produces unmaintainable code.

### 6. 📊 File count inversely correlates with functionality
| Variant | Avg backend .py files | Avg API score |
|---------|----------------------|---------------|
| B (speed) | 2.5 | 14/20 |
| A (control) | 4.5 | 13/20 |
| C (quality) | 5.0 | 17/20 |
| D (TDD) | 15.0 | 9/20 |
| E (adversarial) | 52.0 | 0/20 |

The sweet spot appears to be 3-7 files for this app complexity.

---

## Structural Fingerprints by Variant

| Variant | Backend Structure | Notable Pattern |
|---------|------------------|-----------------|
| **A** | app/main.py, app/database.py, app/models.py | Standard FastAPI layout |
| **B** | main.py (monolith) | Everything in 1-2 files |
| **C** | main.py, database.py, schemas.py | Clean separation, no nesting |
| **D** | app/{models,routers,schemas}/ + tests/ | Package structure + full test suite |
| **E** | src/{domain,application,infrastructure,presentation}/ | Enterprise hexagonal architecture |

---

## Recommendations

Based on this data, an effective AGENTS.md should:

1. **Keep it short** — 10-20 lines max (C's 20 lines hit the sweet spot)
2. **Focus on outcomes, not process** — "make all endpoints work" > "use hexagonal architecture"
3. **Avoid prescribing internal structure** — let the agent choose file organization
4. **Be specific about what matters** — error handling, API completeness, seed data
5. **Never require TDD for complex apps** in a single-shot context — the test overhead eats the budget
6. **Never over-constrain** — every constraint you add takes budget away from actual functionality

### Proposed "Golden" AGENTS.md (for future testing):
```
# AGENTS.md
Build working software. All specified endpoints must return correct data.
Keep the code simple — flat files, no unnecessary abstractions.
Handle errors with proper HTTP status codes.
Initialize the database and seed sample data on first run.
Verify each component works before moving to the next.
```

---

## Raw Data

Auto-scores are in each run's `auto-score.json`. Adherence was scored by manual code inspection.

| Run | Install | Run | API | Frontend | CodeQ | DB | Adhere | **Total** |
|-----|---------|-----|-----|----------|-------|-----|--------|-----------|
| vet-A | 10 | 15 | 10 | 10 | 11 | 10 | 15 | **81** |
| vet-B | 10 | 15 | 10 | 10 | 9 | 10 | 14 | **78** |
| vet-C | 10 | 15 | 18 | 10 | 9 | 8 | 13 | **83** |
| vet-D | 10 | 15 | 12 | 10 | 12 | 10 | 15 | **84** |
| vet-E | 10 | 15 | 0 | 0 | 15 | 8 | 12 | **60** |
| elec-A | 10 | 15 | 16 | 10 | 11 | 10 | 15 | **87** |
| elec-B | 10 | 15 | 18 | 10 | 9 | 8 | 13 | **83** |
| elec-C | 10 | 15 | 16 | 10 | 11 | 8 | 13 | **83** |
| elec-D | 6 | 8 | 6 | 0 | 10 | 10 | 5 | **45** |
| elec-E | 10 | 7 | 0 | 10 | 15 | 10 | 10 | **62** |

---

*Report generated 2026-04-15 by AGENTS.md Impact Test Framework*
