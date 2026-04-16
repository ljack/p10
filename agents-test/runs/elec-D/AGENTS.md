# AGENTS.md

## Strict Test-Driven Development

ALL code in this project MUST follow the TDD red-green-refactor cycle:

### The Process
1. **RED**: Write a failing test that describes the desired behavior
2. **GREEN**: Write the minimum production code to make the test pass
3. **REFACTOR**: Clean up while keeping tests green
4. **REPEAT**: Next behavior, next test

### Rules
- **No production code without a failing test first**
- **One behavior per test** — each test should verify exactly one thing
- **Tests are the specification** — if it's not tested, it doesn't exist
- **Run tests after every change** — never have more than one failing test at a time

### Backend Testing
- Use `pytest` with `pytest-asyncio` for async tests
- Use `httpx.AsyncClient` with FastAPI's `TestClient` for API tests
- Test each endpoint: happy path, validation errors, not-found, edge cases
- Test business logic independently of HTTP layer
- Target: 90%+ code coverage

### Frontend Testing
- Use `vitest` for unit tests
- Test component rendering and user interactions
- Test API integration with mocked fetch

### Test File Structure
```
backend/tests/
  test_pets.py
  test_treatments.py
  test_appointments.py    (or equivalent per domain)
  conftest.py             (fixtures: test client, test db)

frontend/src/lib/
  __tests__/              (component and logic tests)
```

### Definition of Done
A feature is complete ONLY when:
- All tests pass
- Coverage is ≥ 90%
- No skipped or pending tests
