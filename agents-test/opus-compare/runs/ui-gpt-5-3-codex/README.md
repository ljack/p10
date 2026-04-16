# Todo UI v2

A tiny single-page Todo UI built with plain HTML, CSS, and vanilla JS.

## Files

- `index.html` — app markup
- `styles.css` — styles
- `app.js` — UI logic and API calls
- `server.js` — static file server using Node `http`

## Quick start

1. Make sure your Todo API is running (default: `http://localhost:3000`).
2. Start this UI server:

   ```bash
   node server.js
   ```

3. Open:

   ```
   http://localhost:8080
   ```

## Pointing to a different API

Use the **API base** input in the header (top right), for example:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `https://your-api.example.com`

The value is saved in `localStorage` and restored on reload.

A status dot next to the input shows API health:

- green = `/health` returned `{ ok: true }`
- red = API is unreachable or unhealthy
