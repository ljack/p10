const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

// In-memory store
const todos = new Map();

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// List all todos (newest first)
app.get("/todos", (_req, res) => {
  const list = Array.from(todos.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(list);
});

// Get one todo
app.get("/todos/:id", (req, res) => {
  const todo = todos.get(req.params.id);
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  res.json(todo);
});

// Create a todo
app.post("/todos", (req, res) => {
  const { title } = req.body;

  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: "Title must be 200 characters or fewer" });
  }

  const now = new Date().toISOString();
  const todo = {
    id: uuidv4(),
    title: title.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  todos.set(todo.id, todo);
  res.status(201).json(todo);
});

// Update a todo
app.patch("/todos/:id", (req, res) => {
  const todo = todos.get(req.params.id);
  if (!todo) return res.status(404).json({ error: "Todo not found" });

  const { title, completed } = req.body;

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "Title must be 200 characters or fewer" });
    }
    todo.title = title.trim();
  }

  if (completed !== undefined) {
    if (typeof completed !== "boolean") {
      return res.status(400).json({ error: "Completed must be a boolean" });
    }
    todo.completed = completed;
  }

  todo.updatedAt = new Date().toISOString();
  res.json(todo);
});

// Delete a todo
app.delete("/todos/:id", (req, res) => {
  if (!todos.has(req.params.id)) {
    return res.status(404).json({ error: "Todo not found" });
  }
  todos.delete(req.params.id);
  res.status(204).send();
});

// Expose for testing — allows clearing store between tests
app._todos = todos;

module.exports = app;
