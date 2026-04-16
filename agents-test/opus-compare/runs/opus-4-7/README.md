# Todo API

A tiny Todo REST API built with Node.js + Express. In-memory storage, no database.

## Install

```bash
npm install
```

## Run

```bash
npm start
# Todo API listening on http://localhost:3000
```

Set `PORT` to override the port: `PORT=4000 npm start`.

## Test

```bash
npm test
```

## Endpoints

| Method | Path         | Description                       |
| ------ | ------------ | --------------------------------- |
| GET    | `/health`    | Health check                      |
| GET    | `/todos`     | List all todos (newest first)     |
| GET    | `/todos/:id` | Get one todo                      |
| POST   | `/todos`     | Create a todo (`{ title }`)       |
| PATCH  | `/todos/:id` | Update `title` and/or `completed` |
| DELETE | `/todos/:id` | Delete a todo                     |

All 4xx responses have the shape `{ "error": "<message>" }`.

### Data model

```json
{
  "id": "uuid",
  "title": "string (1–200 chars)",
  "completed": false,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## curl examples

```bash
# Health
curl -s http://localhost:3000/health

# Create
curl -s -X POST http://localhost:3000/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy milk"}'

# List
curl -s http://localhost:3000/todos

# Get one
curl -s http://localhost:3000/todos/<id>

# Update
curl -s -X PATCH http://localhost:3000/todos/<id> \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}'

# Delete
curl -s -X DELETE http://localhost:3000/todos/<id> -i
```
