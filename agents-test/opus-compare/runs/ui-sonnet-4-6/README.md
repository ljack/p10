# Todo UI

A simple single-page Todo app that talks to the Todo REST API.

## Stack

- Plain HTML + CSS + vanilla JS — no build step, no dependencies.
- Static files served by a tiny Node `http` server (`server.js`).

## Quick start

```bash
# 1. Start the UI server (default port 8080)
node server.js

# 2. Open in browser
open http://localhost:8080
```

The UI defaults to talking to the API at `http://localhost:3000`.

### Custom ports

```bash
# Run UI on a different port
PORT=9000 node server.js

# Point UI at a different API at launch
# (or change it live via the "API base" field in the header)
```

## Pointing the UI at a different API

1. Find the **API base** field in the page header.
2. Type the full origin of your API server (e.g. `http://192.168.1.42:3000`).
3. Press **Enter** or click away — the UI reconnects immediately and persists the choice in `localStorage`.

The coloured dot next to the field shows API health:

- 🟢 **Green** — `/health` returned `{ ok: true }`
- 🔴 **Red**   — API unreachable or unhealthy

## Features

- Add todos (Enter or "Add" button), with inline validation.
- Toggle completion with a checkbox — updates immediately (optimistic).
- Click a todo title to edit it inline (Enter saves, Esc cancels).
- Delete with the ✕ button (confirms first) — optimistic removal with rollback.
- Relative timestamps ("just now", "5m ago", …).
- Error banner with auto-dismiss on next successful request.

## API expected

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/todos` | — | `Todo[]` newest first |
| `POST` | `/todos` | `{ title }` | `201 Todo` |
| `PATCH` | `/todos/:id` | `{ title?, completed? }` | `Todo` |
| `DELETE` | `/todos/:id` | — | `204` |
| `GET` | `/health` | — | `{ ok: true }` |

Each `Todo`: `{ id, title, completed, createdAt, updatedAt }`.
