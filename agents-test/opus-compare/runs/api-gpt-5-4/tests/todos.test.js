const request = require('supertest');
const app = require('../src/app');

describe('Todo API', () => {
  beforeEach(() => {
    app.locals.resetStore();
  });

  test('health check returns 200', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  test('CRUD happy path for a todo', async () => {
    const createResponse = await request(app)
      .post('/todos')
      .send({ title: 'Buy milk' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      title: 'Buy milk',
      completed: false,
    });
    expect(createResponse.body.id).toEqual(expect.any(String));
    expect(createResponse.body.createdAt).toEqual(expect.any(String));
    expect(createResponse.body.updatedAt).toEqual(expect.any(String));

    const todoId = createResponse.body.id;

    const getOneResponse = await request(app).get(`/todos/${todoId}`);
    expect(getOneResponse.status).toBe(200);
    expect(getOneResponse.body.id).toBe(todoId);

    const listResponse = await request(app).get('/todos');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].id).toBe(todoId);

    const patchResponse = await request(app)
      .patch(`/todos/${todoId}`)
      .send({ title: 'Buy oat milk', completed: true });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body).toMatchObject({
      id: todoId,
      title: 'Buy oat milk',
      completed: true,
    });
    expect(Date.parse(patchResponse.body.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(patchResponse.body.createdAt)
    );

    const deleteResponse = await request(app).delete(`/todos/${todoId}`);
    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.text).toBe('');

    const getDeletedResponse = await request(app).get(`/todos/${todoId}`);
    expect(getDeletedResponse.status).toBe(404);
    expect(getDeletedResponse.body).toEqual({ error: 'Todo not found' });
  });

  test('returns 404 for missing todo on GET, PATCH, and DELETE', async () => {
    const missingId = 'missing-id';

    const getResponse = await request(app).get(`/todos/${missingId}`);
    expect(getResponse.status).toBe(404);
    expect(getResponse.body).toEqual({ error: 'Todo not found' });

    const patchResponse = await request(app)
      .patch(`/todos/${missingId}`)
      .send({ completed: true });
    expect(patchResponse.status).toBe(404);
    expect(patchResponse.body).toEqual({ error: 'Todo not found' });

    const deleteResponse = await request(app).delete(`/todos/${missingId}`);
    expect(deleteResponse.status).toBe(404);
    expect(deleteResponse.body).toEqual({ error: 'Todo not found' });
  });

  test('returns 400 for empty title on POST', async () => {
    const response = await request(app)
      .post('/todos')
      .send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Title is required and must be 1-200 non-whitespace characters',
    });
  });

  test('returns 400 for non-boolean completed on PATCH', async () => {
    const createResponse = await request(app)
      .post('/todos')
      .send({ title: 'Buy milk' });

    const response = await request(app)
      .patch(`/todos/${createResponse.body.id}`)
      .send({ completed: 'yes' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Completed must be a boolean',
    });
  });

  test('lists todos sorted newest first', async () => {
    const firstResponse = await request(app)
      .post('/todos')
      .send({ title: 'First todo' });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const secondResponse = await request(app)
      .post('/todos')
      .send({ title: 'Second todo' });

    const response = await request(app).get('/todos');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((todo) => todo.id)).toEqual([
      secondResponse.body.id,
      firstResponse.body.id,
    ]);
  });
});
