const express = require("express");
const { v4: uuidv4 } = require("uuid");

function createApp() {
  const app = express();
  app.use(express.json());

// x-p10-cors-patch — identical to both baselines so a browser UI can call us
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});


  /** @type {Map<string, {id:string,title:string,completed:boolean,createdAt:string,updatedAt:string}>} */
  const todos = new Map();

  const isValidTitle = (value) =>
    typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 200;

  const badRequest = (res, message) => res.status(400).json({ error: message });
  const notFound = (res) => res.status(404).json({ error: "Todo not found" });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/todos", (_req, res) => {
    const list = Array.from(todos.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    res.json(list);
  });

  app.get("/todos/:id", (req, res) => {
    const todo = todos.get(req.params.id);
    if (!todo) return notFound(res);
    res.json(todo);
  });

  app.post("/todos", (req, res) => {
    const body = req.body || {};
    if (!("title" in body)) return badRequest(res, "title is required");
    if (!isValidTitle(body.title))
      return badRequest(res, "title must be a non-empty string of 1-200 characters");

    const now = new Date().toISOString();
    const todo = {
      id: uuidv4(),
      title: body.title.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    todos.set(todo.id, todo);
    res.status(201).json(todo);
  });

  app.patch("/todos/:id", (req, res) => {
    const todo = todos.get(req.params.id);
    if (!todo) return notFound(res);

    const body = req.body || {};
    const patch = {};

    if ("title" in body) {
      if (!isValidTitle(body.title))
        return badRequest(res, "title must be a non-empty string of 1-200 characters");
      patch.title = body.title.trim();
    }

    if ("completed" in body) {
      if (typeof body.completed !== "boolean")
        return badRequest(res, "completed must be a boolean");
      patch.completed = body.completed;
    }

    if (Object.keys(patch).length === 0)
      return badRequest(res, "no updatable fields provided");

    Object.assign(todo, patch, { updatedAt: new Date().toISOString() });
    res.json(todo);
  });

  app.delete("/todos/:id", (req, res) => {
    if (!todos.has(req.params.id)) return notFound(res);
    todos.delete(req.params.id);
    res.status(204).end();
  });

  // JSON parse errors → 400
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err && err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = createApp();
module.exports.createApp = createApp;
