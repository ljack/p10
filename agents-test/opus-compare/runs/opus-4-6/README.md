# Todo API

A small Todo REST API built with Node.js and Express, using in-memory storage.

## Quick Start

```bash
npm install
npm start        # listens on http://localhost:3000
```

## Run Tests

```bash
npm test
```

## Endpoints

### Health check

```bash
curl http://localhost:3000/health
# {"ok":true}
```

### Create a todo

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

### List all todos (newest first)

```bash
curl http://localhost:3000/todos
```

### Get a single todo

```bash
curl http://localhost:3000/todos/<id>
```

### Update a todo

```bash
curl -X PATCH http://localhost:3000/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

### Delete a todo

```bash
curl -X DELETE http://localhost:3000/todos/<id>
# 204 No Content
```

## Data Model

| Field       | Type    | Notes                        |
|-------------|---------|------------------------------|
| id          | string  | UUID v4                      |
| title       | string  | 1–200 characters, required   |
| completed   | boolean | Default `false`              |
| createdAt   | string  | ISO 8601 timestamp           |
| updatedAt   | string  | ISO 8601 timestamp           |
