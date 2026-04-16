# Todo UI v2

A minimal single-page web UI for the Todo REST API. Plain HTML + CSS + vanilla JS, served by a tiny Node HTTP server. No npm dependencies, no build step.

## Quick start

```sh
# 1. Start your Todo API (expected default: http://localhost:3000)
# 2. In this directory:
node server.js
# → UI at http://localhost:8080
```

Custom port:

```sh
PORT=9000 node server.js
```

## Pointing at a different backend

The API base URL is editable directly in the header (input labeled "API"). The value is persisted to `localStorage` and the status dot next to it reflects `/health`:

- green = `/health` responded OK
- red = unreachable or non-2xx

Default: `http://localhost:3000`.

## Files

- `index.html` — markup with all required `data-testid` and `aria-label` hooks
- `styles.css` — light theme, responsive, system font stack
- `app.js` — all behaviour: fetch, render, optimistic updates, inline edit
- `server.js` — static file server (Node built-ins only)

## Features

- Add todos (Enter submits; empty titles blocked client-side with inline "Title is required")
- Toggle completed (optimistic, rollback on error)
- Inline edit title on click (Enter/blur save, Esc cancels; optimistic)
- Delete with `confirm()` (optimistic, rollback on error)
- Relative createdAt ("just now", "5m ago", "2h ago", "3d ago")
- Top error banner for failed requests, auto-dismisses on next success
- Health dot polled on load, on API-base change, and every 15s
