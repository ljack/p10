# Todo API

A small in-memory Todo REST API built with Node.js + Express.

## Quick start

```bash
npm install
npm start        # listens on http://localhost:3000
```

Run tests:

```bash
npm test
```

---

## Endpoints

| Method   | Path          | Description                        |
|----------|---------------|------------------------------------|
| GET      | /health       | Health check                       |
| GET      | /todos        | List all todos (newest first)      |
| GET      | /todos/:id    | Get a single todo                  |
| POST     | /todos        | Create a todo                      |
| PATCH    | /todos/:id    | Update title and/or completed      |
| DELETE   | /todos/:id    | Delete a todo                      |

---

## curl examples

```bash
# Health check
curl http://localhost:3000/health

# Create a todo
curl -s -X POST http://localhost:3000/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy milk"}' | jq

# List todos
curl -s http://localhost:3000/todos | jq

# Get one todo (replace <id>)
curl -s http://localhost:3000/todos/<id> | jq

# Mark as completed
curl -s -X PATCH http://localhost:3000/todos/<id> \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}' | jq

# Update title
curl -s -X PATCH http://localhost:3000/todos/<id> \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy oat milk"}' | jq

# Delete a todo
curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:3000/todos/<id>
# → 204
```

---

## Data model

```json
{
  "id":        "uuid-v4",
  "title":     "Buy milk",
  "completed": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Validation rules
- `title` is required, must be a non-empty/non-whitespace string, max 200 characters.
- `completed` must be a boolean.
- All `4xx` errors return `{ "error": "<message>" }`.

## Environment

| Variable | Default | Description       |
|----------|---------|-------------------|
| PORT     | 3000    | TCP port to bind  |
