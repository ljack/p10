# Todo UI v2

Small single-page Todo UI built with plain HTML, CSS, and vanilla JS.

## Files

- `index.html` — app shell
- `styles.css` — light responsive styling
- `app.js` — frontend logic
- `server.js` — tiny static file server using Node's built-in `http`

## Quick start

1. Make sure the Todo API is running, by default at `http://localhost:3000`.
2. Start the UI server:

   ```bash
   node server.js
   ```

3. Open `http://localhost:8080` in your browser.

## Point the UI at a different API

Use the **API base** field in the header and enter another base URL, for example:

```text
http://localhost:3001
```

The chosen value is saved in `localStorage`, and the status dot checks `GET /health` on that backend.

## Notes

- No build step
- No npm dependencies
- Works with the Todo REST API described in the task
