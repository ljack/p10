const request = require('supertest');
const app = require('../src/app');

beforeEach(() => {
  app._resetStore();
});

// ── Health ────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

// ── CRUD happy path ───────────────────────────────────────────────────────────

describe('Todo CRUD happy path', () => {
  it('creates a todo', async () => {
    const res = await request(app).post('/todos').send({ title: 'Buy milk' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Buy milk',
      completed: false,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it('gets a todo by id', async () => {
    const created = (await request(app).post('/todos').send({ title: 'Read book' })).body;
    const res = await request(app).get(`/todos/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
    expect(res.body.title).toBe('Read book');
  });

  it('lists all todos', async () => {
    await request(app).post('/todos').send({ title: 'First' });
    await request(app).post('/todos').send({ title: 'Second' });
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('updates a todo title', async () => {
    const created = (await request(app).post('/todos').send({ title: 'Old title' })).body;
    const res = await request(app)
      .patch(`/todos/${created.id}`)
      .send({ title: 'New title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New title');
    expect(res.body.updatedAt).not.toBe(created.updatedAt);
  });

  it('updates completed flag', async () => {
    const created = (await request(app).post('/todos').send({ title: 'Task' })).body;
    const res = await request(app)
      .patch(`/todos/${created.id}`)
      .send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it('deletes a todo and returns 204', async () => {
    const created = (await request(app).post('/todos').send({ title: 'Delete me' })).body;
    const del = await request(app).delete(`/todos/${created.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/todos/${created.id}`);
    expect(get.status).toBe(404);
  });
});

// ── 404 for missing todo ──────────────────────────────────────────────────────

describe('404 for missing todos', () => {
  const missing = '00000000-0000-0000-0000-000000000000';

  it('GET /todos/:id → 404', async () => {
    const res = await request(app).get(`/todos/${missing}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('PATCH /todos/:id → 404', async () => {
    const res = await request(app)
      .patch(`/todos/${missing}`)
      .send({ title: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('DELETE /todos/:id → 404', async () => {
    const res = await request(app).delete(`/todos/${missing}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ── 400 validation ────────────────────────────────────────────────────────────

describe('400 validation errors', () => {
  it('POST with no title → 400', async () => {
    const res = await request(app).post('/todos').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST with empty string title → 400', async () => {
    const res = await request(app).post('/todos').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST with whitespace-only title → 400', async () => {
    const res = await request(app).post('/todos').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST with title > 200 chars → 400', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'a'.repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('PATCH with non-boolean completed → 400', async () => {
    const created = (await request(app).post('/todos').send({ title: 'Task' })).body;
    const res = await request(app)
      .patch(`/todos/${created.id}`)
      .send({ completed: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('PATCH with empty title → 400', async () => {
    const created = (await request(app).post('/todos').send({ title: 'Task' })).body;
    const res = await request(app)
      .patch(`/todos/${created.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ── Sort order ────────────────────────────────────────────────────────────────

describe('GET /todos sort order', () => {
  it('returns todos newest first', async () => {
    await request(app).post('/todos').send({ title: 'First' });
    // small delay to guarantee distinct timestamps
    await new Promise((r) => setTimeout(r, 5));
    await request(app).post('/todos').send({ title: 'Second' });
    await new Promise((r) => setTimeout(r, 5));
    await request(app).post('/todos').send({ title: 'Third' });

    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('Third');
    expect(res.body[1].title).toBe('Second');
    expect(res.body[2].title).toBe('First');
  });
});
