# Todo API

Small Todo REST API built with Node.js, Express, in-memory storage, Jest, and supertest.

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

The server listens on `process.env.PORT || 3000`.

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
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy milk"}'
```

### List todos

```bash
curl http://localhost:3000/todos
```

### Get one todo

```bash
curl http://localhost:3000/todos/<id>
```

### Update a todo

```bash
curl -X PATCH http://localhost:3000/todos/<id> \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy oat milk","completed":true}'
```

### Delete a todo

```bash
curl -X DELETE http://localhost:3000/todos/<id>
```

## Notes

- Storage is in-memory, so data resets when the process restarts.
- Validation errors return JSON in the form `{ "error": "message" }`.
