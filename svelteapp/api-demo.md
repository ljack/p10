# Notes API Demo

## Quick Test Commands

```bash
# Start the development server (if not already running)
cd svelteapp && npm run dev

# Test the API endpoints with curl:

# 1. List all notes (initially empty)
curl http://localhost:5173/api/notes

# 2. Create a new note
curl -X POST http://localhost:5173/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Note",
    "content": "This is the content of my first note."
  }'

# 3. Create another note
curl -X POST http://localhost:5173/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Shopping List", 
    "content": "Milk, Eggs, Bread, Coffee"
  }'

# 4. List all notes again
curl http://localhost:5173/api/notes

# 5. Delete a note (replace note-1 with actual ID from response)
curl -X DELETE http://localhost:5173/api/notes/note-1

# 6. Verify deletion
curl http://localhost:5173/api/notes
```

## Expected Responses

### GET /api/notes
```json
{
  "notes": [
    {
      "id": "note-1",
      "title": "My First Note",
      "content": "This is the content of my first note.",
      "createdAt": "2024-04-07T00:00:00.000Z"
    },
    {
      "id": "note-2", 
      "title": "Shopping List",
      "content": "Milk, Eggs, Bread, Coffee",
      "createdAt": "2024-04-07T00:01:00.000Z"
    }
  ],
  "count": 2
}
```

### POST /api/notes
```json
{
  "note": {
    "id": "note-1",
    "title": "My First Note",
    "content": "This is the content of my first note.",
    "createdAt": "2024-04-07T00:00:00.000Z"
  }
}
```

### DELETE /api/notes/:id
```json
{
  "message": "Note deleted successfully",
  "id": "note-1"
}
```

## JavaScript Usage

```javascript
// Get all notes
const notes = await fetch('/api/notes').then(r => r.json());

// Create a note
const newNote = await fetch('/api/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Note',
    content: 'Note content here'
  })
}).then(r => r.json());

// Delete a note
await fetch('/api/notes/note-1', { method: 'DELETE' });
```

## Frontend UI

Visit http://localhost:5173 and use the NotesExample component to interact with the API through a web interface.