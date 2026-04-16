const request = require("supertest");
const { createApp } = require("../src/app");

const makeApp = () => createApp();

describe("GET /health", () => {
  it("returns 200 and { ok: true }", async () => {
    const res = await request(makeApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("Todos CRUD", () => {
  it("creates, reads, updates, and deletes a todo (happy path)", async () => {
    const app = makeApp();

    // Create
    const create = await request(app).post("/todos").send({ title: "Buy milk" });
    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({
      title: "Buy milk",
      completed: false,
    });
    expect(typeof create.body.id).toBe("string");
    expect(typeof create.body.createdAt).toBe("string");
    expect(typeof create.body.updatedAt).toBe("string");

    const id = create.body.id;

    // List
    const list = await request(app).get("/todos");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(id);

    // Get one
    const getOne = await request(app).get(`/todos/${id}`);
    expect(getOne.status).toBe(200);
    expect(getOne.body.id).toBe(id);

    // Update title
    const patchTitle = await request(app)
      .patch(`/todos/${id}`)
      .send({ title: "Buy oat milk" });
    expect(patchTitle.status).toBe(200);
    expect(patchTitle.body.title).toBe("Buy oat milk");

    // Update completed
    const patchDone = await request(app)
      .patch(`/todos/${id}`)
      .send({ completed: true });
    expect(patchDone.status).toBe(200);
    expect(patchDone.body.completed).toBe(true);

    // Delete
    const del = await request(app).delete(`/todos/${id}`);
    expect(del.status).toBe(204);

    // Confirm gone
    const after = await request(app).get(`/todos/${id}`);
    expect(after.status).toBe(404);
  });
});

describe("404s for missing todo", () => {
  const missingId = "00000000-0000-0000-0000-000000000000";

  it("GET /todos/:id returns 404", async () => {
    const res = await request(makeApp()).get(`/todos/${missingId}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("PATCH /todos/:id returns 404", async () => {
    const res = await request(makeApp())
      .patch(`/todos/${missingId}`)
      .send({ title: "nope" });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("DELETE /todos/:id returns 404", async () => {
    const res = await request(makeApp()).delete(`/todos/${missingId}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});

describe("400 for invalid bodies", () => {
  it("POST /todos with empty title returns 400", async () => {
    const res = await request(makeApp()).post("/todos").send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /todos with whitespace-only title returns 400", async () => {
    const res = await request(makeApp()).post("/todos").send({ title: "   " });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /todos with missing title returns 400", async () => {
    const res = await request(makeApp()).post("/todos").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /todos with >200 char title returns 400", async () => {
    const res = await request(makeApp())
      .post("/todos")
      .send({ title: "a".repeat(201) });
    expect(res.status).toBe(400);
  });

  it("PATCH /todos/:id with non-string completed returns 400", async () => {
    const app = makeApp();
    const create = await request(app).post("/todos").send({ title: "task" });
    const id = create.body.id;

    const res = await request(app)
      .patch(`/todos/${id}`)
      .send({ completed: "yes" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("Sort order", () => {
  it("returns todos newest first", async () => {
    const app = makeApp();

    const a = await request(app).post("/todos").send({ title: "first" });
    // Ensure different createdAt timestamps
    await new Promise((r) => setTimeout(r, 5));
    const b = await request(app).post("/todos").send({ title: "second" });
    await new Promise((r) => setTimeout(r, 5));
    const c = await request(app).post("/todos").send({ title: "third" });

    const list = await request(app).get("/todos");
    expect(list.status).toBe(200);
    expect(list.body.map((t) => t.id)).toEqual([c.body.id, b.body.id, a.body.id]);
  });
});
