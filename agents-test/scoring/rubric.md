# Scoring Rubric — AGENTS.md Impact Test

**Total: 100 points** across 7 dimensions.

---

## 1. Installability (10 pts)

Does the project install without manual intervention?

| Points | Criteria |
|--------|----------|
| 3 | Backend has `requirements.txt` or `pyproject.toml` with all dependencies listed |
| 2 | Frontend has `package.json` with all dependencies listed |
| 3 | `pip install -r requirements.txt` (or equivalent) completes without errors |
| 2 | `npm install` (in frontend/) completes without errors |

**How to test:**
```bash
cd backend && pip install -r requirements.txt 2>&1; echo "EXIT:$?"
cd frontend && npm install 2>&1; echo "EXIT:$?"
```

---

## 2. Runnability (15 pts)

Does the app actually start and respond?

| Points | Criteria |
|--------|----------|
| 5 | Backend starts without crash (`uvicorn` or equivalent, check port 8000) |
| 3 | Backend responds to `GET /api/` or `GET /docs` within 5 seconds |
| 4 | Frontend builds without errors (`npm run build` or `vite build`) |
| 3 | Frontend dev server starts and serves HTML on port 5173 |

**How to test:**
```bash
# Start backend, wait 3s, curl health check
cd backend && timeout 10 uvicorn main:app --port 8000 &
sleep 3 && curl -s http://localhost:8000/docs | head -1

# Build frontend
cd frontend && npm run build 2>&1; echo "EXIT:$?"
```

---

## 3. API Completeness (20 pts)

Are all required endpoints implemented and working?

Score = (endpoints_working / endpoints_required) × 20

**For each endpoint, test:**
- Returns correct HTTP status (200, 201, 404, 422)
- Returns valid JSON
- CRUD actually persists (POST then GET returns the item)
- Filters/query params work

**Vet app required endpoints:** 13 total
**Electricity app required endpoints:** 16 total

Each endpoint scores: 0 (missing/error), 0.5 (exists but broken), 1.0 (works correctly)

---

## 4. Frontend Completeness (10 pts)

Does the frontend have the required pages and functionality?

| Points | Criteria |
|--------|----------|
| 2 | All required routes/pages exist in code |
| 2 | Pages render without JS errors (check for Svelte components) |
| 2 | Forms exist for creating/editing entities |
| 2 | Lists display data from API (fetch calls present) |
| 2 | Navigation between pages works |

**How to test:** Static analysis of Svelte files + build success.

---

## 5. Code Quality (20 pts)

| Points | Criteria |
|--------|----------|
| 4 | **Type hints**: Python functions have type annotations (sample 10 functions) |
| 3 | **Error handling**: try/except or HTTP exception handlers present, not bare except |
| 3 | **No hardcoded values**: no secrets, magic numbers, or hardcoded URLs in source |
| 4 | **File organization**: logical separation (routes, models, db in separate files/modules) |
| 3 | **Linting**: `ruff check` produces < 10 errors on backend code |
| 3 | **Frontend quality**: TypeScript used (not plain JS), no `any` types in critical paths |

---

## 6. Database Quality (10 pts)

| Points | Criteria |
|--------|----------|
| 3 | **Schema correctness**: all required tables/columns present |
| 2 | **Foreign keys**: relationships properly defined |
| 2 | **Indexes**: primary keys exist, logical indexes on filter columns |
| 2 | **Init/migration**: DB is created automatically on first run |
| 1 | **Seed data**: sample data is seeded as specified |

---

## 7. AGENTS.md Adherence (15 pts)

**How well does the output follow the AGENTS.md instructions?**

This is variant-specific:

### Variant A (no AGENTS.md)
- Score 15/15 automatically (no instructions to follow)

### Variant B (Speed)
- 5 pts: Code is minimal, no unnecessary abstractions
- 5 pts: No tests or excessive documentation
- 5 pts: Everything in fewest files possible

### Variant C (Quality Principles)
- 4 pts: Evidence of planning (comments showing approach, or structured commit)
- 4 pts: Simple solutions (no over-engineering)
- 4 pts: Focused code (no unrelated extras)
- 3 pts: Success verification present (health checks, basic validation)

### Variant D (TDD)
- 5 pts: Test files exist
- 4 pts: Tests actually run and pass (`pytest` exits 0)
- 3 pts: Tests cover main endpoints/logic (not just trivial)
- 3 pts: Test structure matches specification (conftest, per-domain files)

### Variant E (Adversarial)
- 3 pts: Attempted hexagonal/clean architecture (any layer separation)
- 3 pts: Attempted some design patterns (repository, factory, etc.)
- 3 pts: Docstrings present on functions
- 3 pts: Custom error handling hierarchy
- 3 pts: App still works despite constraints (functionality not sacrificed)

---

## Scoring Output Format

```json
{
  "run_id": "vet-A",
  "variant": "A",
  "app": "vet",
  "scores": {
    "installability": { "score": 8, "max": 10, "details": "..." },
    "runnability": { "score": 12, "max": 15, "details": "..." },
    "api_completeness": { "score": 16, "max": 20, "details": "..." },
    "frontend_completeness": { "score": 7, "max": 10, "details": "..." },
    "code_quality": { "score": 14, "max": 20, "details": "..." },
    "database_quality": { "score": 8, "max": 10, "details": "..." },
    "agents_adherence": { "score": 10, "max": 15, "details": "..." }
  },
  "total": 75,
  "max_total": 100,
  "notes": "..."
}
```
