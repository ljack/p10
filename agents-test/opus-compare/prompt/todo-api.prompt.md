# Todo API — Build Task

Build a small **Todo REST API** in the CURRENT DIRECTORY.

## Stack
- Node.js + Express
- In-memory storage (no DB)
- Jest + supertest for tests

## Requirements

### Data model
A todo has:
- `id` (string, UUID)
- `title` (string, required, 1–200 chars)
- `completed` (boolean, default false)
- `createdAt` (ISO timestamp)
- `updatedAt` (ISO timestamp)

### Endpoints
- `GET  /todos`            → list all todos (sorted newest first)
- `GET  /todos/:id`        → get one; 404 if missing
- `POST /todos`            → create; body `{ title }`; 400 if missing/invalid
- `PATCH /todos/:id`       → update title and/or completed; 404 if missing; 400 if body invalid
- `DELETE /todos/:id`      → 204 on success; 404 if missing
- `GET  /health`           → `{ ok: true }`

### Behaviour
- Validate `title` length (1–200). Reject empty/whitespace-only.
- All 4xx responses: JSON `{ error: "<message>" }`.
- JSON body parsing middleware.
- Listen on `process.env.PORT || 3000` when run directly.
- Export the app so tests can import it without listening.

### Tests (Jest + supertest)
- Health check returns 200.
- CRUD happy path for a todo.
- 404 for missing todo on GET / PATCH / DELETE.
- 400 for empty title on POST, non-string completed on PATCH.
- Sort order: newest first.

## Deliverables
- `package.json` with `start` and `test` scripts.
- `src/app.js` (or equivalent) — the Express app.
- `src/server.js` — thin entry point that listens.
- `tests/todos.test.js` — the test suite.
- `README.md` — quick instructions.

## Definition of Done
- `npm install && npm test` passes with **all tests green**.
- `npm start` boots on port 3000 and `curl` examples in the README work.
- No linter errors, no TODOs left.

Keep it small, idiomatic, no over-engineering. One file per concern.
