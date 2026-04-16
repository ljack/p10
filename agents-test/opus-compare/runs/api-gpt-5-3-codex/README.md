# Todo REST API

Small Todo API built with Node.js + Express and in-memory storage.

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

Server starts on `process.env.PORT || 3000`.

## Test

```bash
npm test
```

## API

### Health

```bash
curl http://localhost:3000/health
```

### Create a todo

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

### List todos (newest first)

```bash
curl http://localhost:3000/todos
```

### Get one

```bash
curl http://localhost:3000/todos/<id>
```

### Update

```bash
curl -X PATCH http://localhost:3000/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy almond milk","completed":true}'
```

### Delete

```bash
curl -X DELETE http://localhost:3000/todos/<id>
```

## Notes

- Todo fields: `id`, `title`, `completed`, `createdAt`, `updatedAt`
- Validation: `title` is required, trimmed length 1–200
- All 4xx responses return JSON: `{ "error": "..." }`
