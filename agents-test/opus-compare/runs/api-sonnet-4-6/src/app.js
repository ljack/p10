const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// x-p10-cors-patch — identical shared CORS middleware for browser tests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});


// In-memory store
let todos = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateTitle(title) {
  if (title === undefined || title === null) return 'title is required';
  if (typeof title !== 'string') return 'title must be a string';
  if (title.trim().length === 0) return 'title must not be empty or whitespace';
  if (title.trim().length > 200) return 'title must be 200 characters or fewer';
  return null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// List all todos — newest first
app.get('/todos', (_req, res) => {
  const sorted = [...todos].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(sorted);
});

// Get one
app.get('/todos/:id', (req, res) => {
  const todo = todos.find((t) => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json(todo);
});

// Create
app.post('/todos', (req, res) => {
  const { title } = req.body || {};
  const err = validateTitle(title);
  if (err) return res.status(400).json({ error: err });

  const now = new Date().toISOString();
  const todo = {
    id: uuidv4(),
    title: title.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  todos.push(todo);
  res.status(201).json(todo);
});

// Update
app.patch('/todos/:id', (req, res) => {
  const todo = todos.find((t) => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  const { title, completed } = req.body || {};
  const hasTitle = title !== undefined;
  const hasCompleted = completed !== undefined;

  if (!hasTitle && !hasCompleted) {
    return res.status(400).json({ error: 'Provide at least one of title or completed' });
  }

  if (hasTitle) {
    const err = validateTitle(title);
    if (err) return res.status(400).json({ error: err });
    todo.title = title.trim();
  }

  if (hasCompleted) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be a boolean' });
    }
    todo.completed = completed;
  }

  todo.updatedAt = new Date().toISOString();
  res.json(todo);
});

// Delete
app.delete('/todos/:id', (req, res) => {
  const index = todos.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Todo not found' });
  todos.splice(index, 1);
  res.status(204).send();
});

// ── Test helper ───────────────────────────────────────────────────────────────

app._resetStore = () => {
  todos = [];
};

module.exports = app;
