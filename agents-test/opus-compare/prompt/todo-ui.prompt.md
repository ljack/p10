# Todo UI — Build Task

Build a **simple single-page web UI** for the Todo REST API in the CURRENT DIRECTORY.

## Stack
- Plain **HTML + CSS + vanilla JS** (no React, no bundler, no build step).
- One static `index.html`, one `styles.css`, one `app.js`.
- A tiny `server.js` using Node's built-in `http` module that serves the three static files. No npm deps.

## API it talks to
A Todo REST API already runs at a configurable base URL (default `http://localhost:3000`):

- `GET    /todos`       → list todos (newest first)
- `GET    /todos/:id`   → single todo
- `POST   /todos`       → `{ title }` → 201 todo | 400 `{ error }`
- `PATCH  /todos/:id`   → `{ title?, completed? }` → todo | 400/404
- `DELETE /todos/:id`   → 204 | 404
- `GET    /health`      → `{ ok: true }`

Each todo: `{ id, title, completed, createdAt, updatedAt }`.

## UI requirements

- **Header** with app title and an API-base input (text box) so the user can point the UI at any backend. Persist the chosen base URL in `localStorage`. Show a small green/red status dot next to it based on `/health`.
- **Add form**: single text input + "Add" button. Enter key submits. Disables while in-flight. Shows inline error message for 400s.
- **List** of todos, newest first. Each row:
  - Checkbox for `completed` (PATCH on toggle).
  - Title — click to edit inline (Enter saves, Esc cancels, blur saves). PATCH on save.
  - Delete button ("✕"). Confirm via `confirm()`. DELETE on confirm.
  - Relative time display ("just now", "5m ago", "2h ago") for `createdAt`.
- **Empty state** when list is empty ("No todos yet. Add one above.").
- **Error banner** at the top when a request fails, with dismiss button. Auto-dismiss on next successful request.
- **Optimistic updates** for toggle/edit/delete, rollback on error.

## Styling

Keep it tasteful but simple. No frameworks. A single `styles.css`:
- System font stack.
- Light, readable, responsive up to mobile width.
- Subtle hover states, focus rings on inputs.
- Strikethrough + muted colour on completed todos.

## Server
`server.js`:
- Reads `process.env.PORT` (default `8080`).
- Serves `index.html` at `/`, plus `/styles.css` and `/app.js` with correct content types.
- 404 for anything else.
- Logs each request to stdout with method + path + status.

## Deliverables
- `index.html`
- `styles.css`
- `app.js`
- `server.js`
- `README.md` — quick start + how to point it at a running API (e.g. `PORT=8080 node server.js`, then visit the app, set API base in the header).

## Definition of Done
- `node server.js` boots and the page loads.
- With the Todo API running on `http://localhost:3000`, the UI can create, list, toggle, edit, and delete todos end-to-end.
- No JS console errors. No linter errors. No TODOs left.

Keep it small, idiomatic, no over-engineering. Total JS under ~300 lines.
