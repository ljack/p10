const express = require('express');
const { randomUUID } = require('node:crypto');

function isValidTitle(title) {
  if (typeof title !== 'string') return false;
  const trimmed = title.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function createApp() {
  const app = express();
  const todos = new Map();

  app.use(express.json());

// x-p10-cors-patch — identical shared CORS middleware for browser tests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});


  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/todos', (_req, res) => {
    const list = Array.from(todos.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    res.json(list);
  });

  app.get('/todos/:id', (req, res) => {
    const todo = todos.get(req.params.id);
    if (!todo) return sendError(res, 404, 'Todo not found');
    res.json(todo);
  });

  app.post('/todos', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendError(res, 400, 'Invalid request body');
    }

    if (!isValidTitle(body.title)) {
      return sendError(res, 400, 'Title must be 1-200 non-whitespace characters');
    }

    const now = new Date().toISOString();
    const todo = {
      id: randomUUID(),
      title: body.title.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    todos.set(todo.id, todo);
    res.status(201).json(todo);
  });

  app.patch('/todos/:id', (req, res) => {
    const todo = todos.get(req.params.id);
    if (!todo) return sendError(res, 404, 'Todo not found');

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendError(res, 400, 'Invalid request body');
    }

    const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title');
    const hasCompleted = Object.prototype.hasOwnProperty.call(body, 'completed');

    if (!hasTitle && !hasCompleted) {
      return sendError(res, 400, 'Request must include title and/or completed');
    }

    if (hasTitle && !isValidTitle(body.title)) {
      return sendError(res, 400, 'Title must be 1-200 non-whitespace characters');
    }

    if (hasCompleted && typeof body.completed !== 'boolean') {
      return sendError(res, 400, 'Completed must be a boolean');
    }

    if (hasTitle) todo.title = body.title.trim();
    if (hasCompleted) todo.completed = body.completed;
    todo.updatedAt = new Date().toISOString();

    res.json(todo);
  });

  app.delete('/todos/:id', (req, res) => {
    const exists = todos.has(req.params.id);
    if (!exists) return sendError(res, 404, 'Todo not found');

    todos.delete(req.params.id);
    res.status(204).send();
  });

  app.use((err, _req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return sendError(res, 400, 'Invalid JSON body');
    }
    return next(err);
  });

  return app;
}

const app = createApp();

module.exports = {
  app,
  createApp,
};
