const express = require('express');
const { randomUUID } = require('crypto');

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


let todos = [];

function error(res, status, message) {
  return res.status(status).json({ error: message });
}

function isValidTitle(title) {
  return typeof title === 'string' && title.trim().length >= 1 && title.trim().length <= 200;
}

function findTodo(id) {
  return todos.find((todo) => todo.id === id);
}

app.locals.resetStore = () => {
  todos = [];
};

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/todos', (_req, res) => {
  const sortedTodos = [...todos].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  res.json(sortedTodos);
});

app.get('/todos/:id', (req, res) => {
  const todo = findTodo(req.params.id);

  if (!todo) {
    return error(res, 404, 'Todo not found');
  }

  return res.json(todo);
});

app.post('/todos', (req, res) => {
  const { title } = req.body ?? {};

  if (!isValidTitle(title)) {
    return error(res, 400, 'Title is required and must be 1-200 non-whitespace characters');
  }

  const now = new Date().toISOString();
  const todo = {
    id: randomUUID(),
    title: title.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  todos.push(todo);
  return res.status(201).json(todo);
});

app.patch('/todos/:id', (req, res) => {
  const todo = findTodo(req.params.id);

  if (!todo) {
    return error(res, 404, 'Todo not found');
  }

  const updates = req.body ?? {};
  const allowedKeys = ['title', 'completed'];
  const keys = Object.keys(updates);

  if (keys.length === 0) {
    return error(res, 400, 'Request body must include title and/or completed');
  }

  if (keys.some((key) => !allowedKeys.includes(key))) {
    return error(res, 400, 'Only title and completed can be updated');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'title') && !isValidTitle(updates.title)) {
    return error(res, 400, 'Title must be 1-200 non-whitespace characters');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'completed') && typeof updates.completed !== 'boolean') {
    return error(res, 400, 'Completed must be a boolean');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
    todo.title = updates.title.trim();
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'completed')) {
    todo.completed = updates.completed;
  }

  todo.updatedAt = new Date().toISOString();
  return res.json(todo);
});

app.delete('/todos/:id', (req, res) => {
  const index = todos.findIndex((todo) => todo.id === req.params.id);

  if (index === -1) {
    return error(res, 404, 'Todo not found');
  }

  todos.splice(index, 1);
  return res.status(204).send();
});

app.use((req, res) => {
  return error(res, 404, 'Not found');
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return error(res, 400, 'Invalid JSON body');
  }

  return error(res, 500, 'Internal server error');
});

module.exports = app;
