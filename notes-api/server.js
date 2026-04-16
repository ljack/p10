const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
let notes = [];
let nextId = 1;

// Helper to find note by ID
const findNoteIndex = (id) => notes.findIndex(note => note.id === parseInt(id));

// GET /api/notes - List all notes
app.get('/api/notes', (req, res) => {
  res.json({
    success: true,
    data: notes,
    count: notes.length
  });
});

// GET /api/notes/search - Search notes by title or content
app.get('/api/notes/search', (req, res) => {
  const { q } = req.query;
  
  // Validation
  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "q" is required and must be a non-empty string'
    });
  }
  
  const query = q.trim().toLowerCase();
  
  // Filter notes by title or content (case-insensitive)
  const filteredNotes = notes.filter(note => {
    const titleMatch = note.title.toLowerCase().includes(query);
    const contentMatch = note.content.toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });
  
  res.json({
    success: true,
    data: filteredNotes,
    count: filteredNotes.length,
    query: q.trim()
  });
});

// GET /api/notes/:id - Get single note
app.get('/api/notes/:id', (req, res) => {
  const index = findNoteIndex(req.params.id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Note not found'
    });
  }
  
  res.json({
    success: true,
    data: notes[index]
  });
});

// POST /api/notes - Create new note
app.post('/api/notes', (req, res) => {
  const { title, content } = req.body;
  
  // Validation
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Title is required and must be a non-empty string'
    });
  }
  
  const now = new Date().toISOString();
  const note = {
    id: nextId++,
    title: title.trim(),
    content: content || '',
    createdAt: now,
    updatedAt: now
  };
  
  notes.push(note);
  
  res.status(201).json({
    success: true,
    data: note
  });
});

// PUT /api/notes/:id - Update note
app.put('/api/notes/:id', (req, res) => {
  const index = findNoteIndex(req.params.id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Note not found'
    });
  }
  
  const { title, content } = req.body;
  
  // Validation - at least one field must be provided
  if (title === undefined && content === undefined) {
    return res.status(400).json({
      success: false,
      error: 'At least title or content must be provided'
    });
  }
  
  // Title validation if provided
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: 'Title must be a non-empty string'
    });
  }
  
  const existingNote = notes[index];
  const updatedNote = {
    ...existingNote,
    title: title !== undefined ? title.trim() : existingNote.title,
    content: content !== undefined ? content : existingNote.content,
    updatedAt: new Date().toISOString()
  };
  
  notes[index] = updatedNote;
  
  res.json({
    success: true,
    data: updatedNote
  });
});

// DELETE /api/notes/:id - Delete note
app.delete('/api/notes/:id', (req, res) => {
  const index = findNoteIndex(req.params.id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Note not found'
    });
  }
  
  const deletedNote = notes.splice(index, 1)[0];
  
  res.json({
    success: true,
    data: deletedNote,
    message: 'Note deleted successfully'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`📝 Notes API server running on http://localhost:${PORT}`);
  console.log(`
Endpoints:
  GET    /api/notes           - List all notes
  GET    /api/notes/search    - Search notes (query: ?q=text)
  GET    /api/notes/:id       - Get note by ID
  POST   /api/notes           - Create note (body: { title, content })
  PUT    /api/notes/:id       - Update note (body: { title?, content? })
  DELETE /api/notes/:id       - Delete note
`);
});

module.exports = app;
