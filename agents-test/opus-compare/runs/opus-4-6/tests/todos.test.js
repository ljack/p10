const request = require("supertest");
const app = require("../src/app");

beforeEach(() => {
  app._todos.clear();
});

describe("GET /health", () => {
  it("returns 200 with { ok: true }", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("CRUD happy path", () => {
  let todoId;

  it("POST /todos creates a todo", async () => {
    const res = await request(app)
      .post("/todos")
      .send({ title: "Buy milk" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Buy milk",
      completed: false,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
    todoId = res.body.id;
  });

  it("GET /todos lists the created todo", async () => {
    // create one first
    const created = await request(app)
      .post("/todos")
      .send({ title: "Buy milk" });
    todoId = created.body.id;

    const res = await request(app).get("/todos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(todoId);
  });

  it("GET /todos/:id returns the todo", async () => {
    const created = await request(app)
      .post("/todos")
      .send({ title: "Buy milk" });
    todoId = created.body.id;

    const res = await request(app).get(`/todos/${todoId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Buy milk");
  });

  it("PATCH /todos/:id updates the todo", async () => {
    const created = await request(app)
      .post("/todos")
      .send({ title: "Buy milk" });
    todoId = created.body.id;

    const res = await request(app)
      .patch(`/todos/${todoId}`)
      .send({ title: "Buy oat milk", completed: true });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Buy oat milk");
    expect(res.body.completed).toBe(true);
  });

  it("DELETE /todos/:id removes the todo", async () => {
    const created = await request(app)
      .post("/todos")
      .send({ title: "Buy milk" });
    todoId = created.body.id;

    const del = await request(app).delete(`/todos/${todoId}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/todos/${todoId}`);
    expect(get.status).toBe(404);
  });
});

describe("404 for missing todo", () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";

  it("GET /todos/:id returns 404", async () => {
    const res = await request(app).get(`/todos/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("PATCH /todos/:id returns 404", async () => {
    const res = await request(app)
      .patch(`/todos/${fakeId}`)
      .send({ title: "Nope" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("DELETE /todos/:id returns 404", async () => {
    const res = await request(app).delete(`/todos/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe("400 validation errors", () => {
  it("POST /todos with missing title returns 400", async () => {
    const res = await request(app).post("/todos").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("POST /todos with empty title returns 400", async () => {
    const res = await request(app).post("/todos").send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("POST /todos with whitespace-only title returns 400", async () => {
    const res = await request(app).post("/todos").send({ title: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("POST /todos with title > 200 chars returns 400", async () => {
    const res = await request(app)
      .post("/todos")
      .send({ title: "a".repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("PATCH /todos/:id with non-boolean completed returns 400", async () => {
    const created = await request(app)
      .post("/todos")
      .send({ title: "Test" });

    const res = await request(app)
      .patch(`/todos/${created.body.id}`)
      .send({ completed: "yes" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe("Sort order", () => {
  it("returns todos newest first", async () => {
    await request(app).post("/todos").send({ title: "First" });
    // small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    await request(app).post("/todos").send({ title: "Second" });
    await new Promise((r) => setTimeout(r, 10));
    await request(app).post("/todos").send({ title: "Third" });

    const res = await request(app).get("/todos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].title).toBe("Third");
    expect(res.body[1].title).toBe("Second");
    expect(res.body[2].title).toBe("First");
  });
});
