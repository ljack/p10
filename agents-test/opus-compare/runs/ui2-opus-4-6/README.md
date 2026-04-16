# Todo UI

A simple single-page Todo app built with plain HTML, CSS, and vanilla JavaScript.

## Quick Start

```bash
node server.js          # starts on http://localhost:8080
# or
PORT=9090 node server.js
```

Open `http://localhost:8080` in your browser.

## Pointing at a Todo API

The UI talks to a Todo REST API. By default it expects the API at `http://localhost:3000`.

You can change the API base URL in the header input field. The chosen URL is persisted in `localStorage`.

A green dot means the API's `/health` endpoint is reachable; red means it's down.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup |
| `styles.css` | Styles |
| `app.js` | Client-side logic |
| `server.js` | Static file server (Node, no dependencies) |
