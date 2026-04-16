# Notes API

REST API for note-taking with CRUD operations. Uses in-memory storage.

## Quick Start

```bash
npm install
npm start
```

Server runs on http://localhost:3001

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes |
| GET | `/api/notes/search` | Search notes by title or content |
| GET | `/api/notes/:id` | Get note by ID |
| POST | `/api/notes` | Create new note |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Delete note |

## Note Schema

```json
{
  "id": 1,
  "title": "Note Title",
  "content": "Note content...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Examples

### Create a note
```bash
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "My Note", "content": "Hello world!"}'
```

### List all notes
```bash
curl http://localhost:3001/api/notes
```

### Search notes
```bash
# Search for notes containing "meeting" in title or content
curl "http://localhost:3001/api/notes/search?q=meeting"

# Search is case-insensitive
curl "http://localhost:3001/api/notes/search?q=MEETING"
```

### Get single note
```bash
curl http://localhost:3001/api/notes/1
```

### Update note
```bash
curl -X PUT http://localhost:3001/api/notes/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "content": "Updated content"}'
```

### Delete note
```bash
curl -X DELETE http://localhost:3001/api/notes/1
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "count": 0,        // for list and search endpoints
  "query": "...",    // for search endpoint
  "message": "..."   // for delete
}
```

## Search Query Parameters

- `q` (required): Search query string
  - Must be a non-empty string
  - Searches both title and content fields
  - Case-insensitive matching
  - Returns notes where title OR content contains the query

### Search Response Example
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Meeting Notes",
      "content": "Important discussion points...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "query": "meeting"
}
```

## Running Tests

```bash
# Start server in one terminal
npm start

# Run tests in another terminal
npm test
```
