# Todo UI

A tiny single-page web UI for the Todo REST API. Plain HTML, CSS, and vanilla
JavaScript — no frameworks, no build step, no npm dependencies.

## Quick start

```bash
node server.js
```

Then open <http://localhost:8080>.

Override the port with `PORT`:

```bash
PORT=9000 node server.js
```

## Pointing at an API

The UI assumes the Todo REST API is running at `http://localhost:3000` by
default. To use a different backend, change the **API** input in the page
header — the value is persisted in `localStorage`. The dot next to it turns
green when `GET /health` succeeds and red otherwise.

## Features

- Add, list, toggle, inline-edit, and delete todos.
- Optimistic updates with rollback on error.
- Inline 400 errors on add; top error banner for other failures
  (auto-dismisses on next successful request).
- Relative timestamps ("just now", "5m ago", …).
- Responsive layout down to mobile widths.

## Files

- `index.html` — markup
- `styles.css` — styling
- `app.js` — UI logic and API client
- `server.js` — Node `http` static file server
