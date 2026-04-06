# Notes API

A simple notes API with in-memory storage, built with SvelteKit and Zod validation.

## Endpoints

### GET /api/notes

Returns all notes with their metadata.

**Response:**
```json
{
  "notes": [
    {
      "id": "note-1",
      "title": "My First Note", 
      "content": "This is the content of my first note.",
      "createdAt": "2024-04-07T00:00:00.000Z",
      "updatedAt": "2024-04-07T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### POST /api/notes

Creates a new note with auto-generated ID and timestamps.

**Request:**
```json
{
  "title": "My Note Title",
  "content": "The content of my note"
}
```

**Response (201 Created):**
```json
{
  "note": {
    "id": "note-1",
    "title": "My Note Title",
    "content": "The content of my note", 
    "createdAt": "2024-04-07T00:00:00.000Z",
    "updatedAt": "2024-04-07T00:00:00.000Z"
  }
}
```

### PUT /api/notes/:id

Updates an existing note by ID. Updates the `updatedAt` timestamp automatically.

**Request:**
```json
{
  "title": "Updated Note Title",
  "content": "Updated note content"
}
```

**Response (200 OK):**
```json
{
  "note": {
    "id": "note-1",
    "title": "Updated Note Title",
    "content": "Updated note content",
    "createdAt": "2024-04-07T00:00:00.000Z",
    "updatedAt": "2024-04-07T01:00:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "message": "Note not found",
  "status": 404
}
```

### DELETE /api/notes/:id

Deletes a note by ID.

**Response (200 OK):**
```json
{
  "message": "Note deleted successfully",
  "id": "note-1"
}
```

**Response (404 Not Found):**
```json
{
  "message": "Note not found",
  "status": 404
}
```

## Validation Rules

- `title`: Required, 1-255 characters
- `content`: Optional, maximum 10,000 characters

## Error Responses

**400 Bad Request (Validation Error):**
```json
{
  "message": "Validation error: title: Title is required",
  "status": 400
}
```

**404 Not Found (DELETE only):**
```json
{
  "message": "Note not found",
  "status": 404
}
```

**500 Internal Server Error:**
```json
{
  "message": "Failed to create note", 
  "status": 500
}
```

## Usage Examples

### JavaScript/Fetch

```javascript
// Get all notes
const response = await fetch('/api/notes');
const { notes, count } = await response.json();

// Create a new note
const newNote = {
  title: 'Shopping List',
  content: 'Milk, Eggs, Bread'
};

const response = await fetch('/api/notes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newNote)
});

const { note } = await response.json();

// Update a note
const updateData = {
  title: 'Updated Shopping List',
  content: 'Milk, Eggs, Bread, Butter'
};

const updateResponse = await fetch('/api/notes/note-1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updateData)
});

if (updateResponse.ok) {
  const { note: updatedNote } = await updateResponse.json();
  console.log(updatedNote.updatedAt); // New timestamp
}

// Delete a note
const deleteResponse = await fetch('/api/notes/note-1', {
  method: 'DELETE'
});

if (deleteResponse.ok) {
  const { message } = await deleteResponse.json();
  console.log(message); // "Note deleted successfully"
}
```

### cURL

```bash
# Get all notes
curl -X GET http://localhost:5173/api/notes

# Create a new note
curl -X POST http://localhost:5173/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "My Note", "content": "Note content here"}'

# Update a note
curl -X PUT http://localhost:5173/api/notes/note-1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Note", "content": "Updated content"}'

# Delete a note
curl -X DELETE http://localhost:5173/api/notes/note-1
```

## Data Model

The notes data model includes:

- `id`: Auto-generated unique identifier (string)
- `title`: Note title (string, 1-255 chars)
- `content`: Note content (string, max 10,000 chars) 
- `createdAt`: Creation timestamp (ISO date)
- `updatedAt`: Last update timestamp (ISO date)

## Storage

Notes are stored in memory and will be lost when the server restarts. This is suitable for development and testing purposes.