# Todo UI v2 — Build Task (with testable markers)

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

- **Header** with app title and an API-base input so the user can point the UI at any backend. Persist the chosen base URL in `localStorage`. Show a small green/red status dot next to it based on `/health`.
- **Add form**: single text input + "Add" button. Enter key submits. Disables while in-flight. Shows inline error message for 400s.
- **List** of todos, newest first. Each row:
  - Checkbox for `completed` (PATCH on toggle).
  - Title — click to edit inline (Enter saves, Esc cancels, blur saves). PATCH on save.
  - Delete button ("✕"). DELETE on confirm via `confirm()`.
  - Relative time display ("just now", "5m ago", "2h ago") for `createdAt`.
- **Empty state** when list is empty ("No todos yet. Add one above.").
- **Error banner** at the top when a request fails, with dismiss button. Auto-dismiss on next successful request.
- **Optimistic updates** for toggle/edit/delete, rollback on error.

## ⚠ Testability contract — REQUIRED

The UI will be exercised by automated tests. You **must** apply these `data-testid` attributes and `aria-label`s exactly as written. Also use these visible text strings verbatim where noted.

### Global
| Element | `data-testid` | Notes |
|---|---|---|
| Error banner container | `error-banner` | Only in DOM (or not `hidden`) when a request fails. Child `.error-message` has the text. |
| Error banner dismiss button | `error-banner-dismiss` | `aria-label="Dismiss error"` |
| App root container | `app-root` | Wraps everything |

### Header
| Element | `data-testid` | Notes |
|---|---|---|
| API base input | `api-base-input` | `<input>` with `aria-label="API base URL"` |
| API base status dot | `api-base-status` | `data-status="ok"` when health is green, `data-status="down"` otherwise |

### Add form
| Element | `data-testid` | Notes |
|---|---|---|
| Form element | `add-form` | `<form>` |
| Title input | `add-input` | `aria-label="New todo title"` |
| Submit button | `add-submit` | Visible text "Add" |
| Add error message (inline) | `add-error` | Only in DOM when the add attempt was 400 |

### List
| Element | `data-testid` | Notes |
|---|---|---|
| List container | `todo-list` | `<ul>` or `<ol>` |
| Empty-state placeholder | `empty-state` | Visible **only** when zero todos. Text must contain `No todos yet` |
| Each item | `todo-item` | `data-id="<todo.id>"` and `data-completed="true"|"false"` |
| Toggle checkbox | `todo-item-toggle` | `<input type="checkbox">` with `aria-label="Toggle completed"` |
| Title span / editable | `todo-item-title` | Contains the text. When being edited becomes an `<input>` with `data-testid="todo-item-title-input"` |
| Delete button | `todo-item-delete` | `aria-label="Delete todo"`, text content `✕` |
| Created-at relative | `todo-item-time` | Text like "just now" / "5m ago" |

### Behaviour contract (for tests)

- When the add form is submitted with an empty or whitespace-only title: do **not** POST; show `add-error` with the text `Title is required` (do not rely on server 400).
- After any successful API call, remove the error banner.
- `api-base-status` updates at least on page load and whenever the API base changes.
- All async actions set `aria-busy="true"` on their nearest form/item while in-flight (optional but recommended).

## Server
`server.js`:
- Reads `process.env.PORT` (default `8080`).
- Serves `index.html` at `/`, plus `/styles.css` and `/app.js` with correct content types.
- 404 (plain text "Not Found") for anything else.
- Logs each request to stdout with `<METHOD> <PATH> <STATUS>`.

### ⚠ Self-test rule (IMPORTANT)
- **Do not run the server in the background as part of your own verification.** No `&`, no `disown`, no `nohup`.
- You may start the server with a short `timeout 2 node server.js &` pattern only if you explicitly kill it afterwards, but prefer:
  - `node -c server.js`  (syntax check)
  - `node -e "require('./server.js')"` — but since server.js listens on import, guard listening with `if (require.main === module)`.
- Leave no background processes running when you finish.

## Styling

Keep it tasteful but simple. System font stack. Light theme. Responsive to mobile. Subtle hover, visible focus rings, strikethrough for completed.

## Deliverables
- `index.html`
- `styles.css`
- `app.js`
- `server.js`
- `README.md` — quick start + how to point it at a running API.

## Definition of Done
- `node server.js` boots and the page loads.
- With the Todo API running on `http://localhost:3000`, the UI can create, list, toggle, edit, and delete todos end-to-end.
- All `data-testid` / `aria-label` / text contracts above are in place.
- No JS console errors. No TODOs left.
- No stray background processes left behind.

Keep it small, idiomatic, no over-engineering. Total JS under ~300 lines.
