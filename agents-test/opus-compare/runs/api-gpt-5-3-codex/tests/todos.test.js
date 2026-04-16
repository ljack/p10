const request = require('supertest');
const { createApp } = require('../src/app');

describe('Todo API', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  test('health check returns 200', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('CRUD happy path for a todo', async () => {
    const createRes = await request(app)
      .post('/todos')
      .send({ title: 'Buy milk' });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      title: 'Buy milk',
      completed: false,
    });
    expect(typeof createRes.body.id).toBe('string');
    expect(typeof createRes.body.createdAt).toBe('string');
    expect(typeof createRes.body.updatedAt).toBe('string');

    const id = createRes.body.id;

    const getRes = await request(app).get(`/todos/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(id);

    const patchRes = await request(app)
      .patch(`/todos/${id}`)
      .send({ title: 'Buy almond milk', completed: true });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toMatchObject({
      id,
      title: 'Buy almond milk',
      completed: true,
    });

    const listRes = await request(app).get('/todos');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((t) => t.id === id)).toBeTruthy();

    const deleteRes = await request(app).delete(`/todos/${id}`);
    expect(deleteRes.status).toBe(204);

    const getAfterDelete = await request(app).get(`/todos/${id}`);
    expect(getAfterDelete.status).toBe(404);
    expect(getAfterDelete.body).toEqual({ error: 'Todo not found' });
  });

  test('404 for missing todo on GET / PATCH / DELETE', async () => {
    const missingId = 'missing-id';

    const getRes = await request(app).get(`/todos/${missingId}`);
    expect(getRes.status).toBe(404);
    expect(getRes.body).toEqual({ error: 'Todo not found' });

    const patchRes = await request(app)
      .patch(`/todos/${missingId}`)
      .send({ title: 'x' });
    expect(patchRes.status).toBe(404);
    expect(patchRes.body).toEqual({ error: 'Todo not found' });

    const deleteRes = await request(app).delete(`/todos/${missingId}`);
    expect(deleteRes.status).toBe(404);
    expect(deleteRes.body).toEqual({ error: 'Todo not found' });
  });

  test('400 for empty title on POST, non-string completed on PATCH', async () => {
    const badPost = await request(app)
      .post('/todos')
      .send({ title: '   ' });

    expect(badPost.status).toBe(400);
    expect(badPost.body).toEqual({
      error: 'Title must be 1-200 non-whitespace characters',
    });

    const createRes = await request(app)
      .post('/todos')
      .send({ title: 'Valid title' });

    const badPatch = await request(app)
      .patch(`/todos/${createRes.body.id}`)
      .send({ completed: 'yes' });

    expect(badPatch.status).toBe(400);
    expect(badPatch.body).toEqual({
      error: 'Completed must be a boolean',
    });
  });

  test('sort order is newest first', async () => {
    const first = await request(app).post('/todos').send({ title: 'First' });

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = await request(app).post('/todos').send({ title: 'Second' });

    const listRes = await request(app).get('/todos');

    expect(listRes.status).toBe(200);
    expect(listRes.body[0].id).toBe(second.body.id);
    expect(listRes.body[1].id).toBe(first.body.id);
  });
});
