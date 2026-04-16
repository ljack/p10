# Todo UI

A minimal single-page todo app built with plain HTML, CSS, and vanilla JS. No dependencies.

## Quick Start

```bash
node server.js
```

The UI serves on **http://localhost:8080** by default. Override with `PORT`:

```bash
PORT=9090 node server.js
```

## Connecting to the API

1. Start the Todo REST API (defaults to `http://localhost:3000`).
2. Open the UI in your browser.
3. The **API** field in the header shows the current backend URL. Change it to point at any running Todo API instance — the choice is saved in `localStorage`.
4. The dot next to the input turns **green** when the API is reachable and **red** when it isn't.

## Features

- Create, list, toggle, inline-edit, and delete todos.
- Optimistic UI updates with rollback on error.
- Relative timestamps ("just now", "5m ago", …).
- Error banner with auto-dismiss on next success.
- Responsive down to mobile widths.
