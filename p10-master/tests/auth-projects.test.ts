import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('Auth & Projects', () => {
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	// --- Auth ---

	it('POST /auth/login creates new user', async () => {
		const data = await master.post('/auth/login', { username: 'testuser' });
		assert.ok(data.user);
		assert.strictEqual(data.user.username, 'testuser');
		assert.ok(data.user.id);
		assert.ok(data.user.createdAt);
	});

	it('POST /auth/login returns existing user on repeat', async () => {
		const data1 = await master.post('/auth/login', { username: 'repeatuser' });
		const data2 = await master.post('/auth/login', { username: 'repeatuser' });
		assert.strictEqual(data1.user.id, data2.user.id);
	});

	it('POST /auth/login rejects empty username', async () => {
		const resp = await fetch(`${master.url}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: '' }),
		});
		assert.strictEqual(resp.status, 400);
	});

	it('GET /auth/users lists users', async () => {
		const data = await master.fetch('/auth/users');
		assert.ok(Array.isArray(data.users));
		assert.ok(data.users.length >= 1);
	});

	// --- Projects ---

	let testUserId: string;
	let testProjectId: string;

	it('create test user for projects', async () => {
		const data = await master.post('/auth/login', { username: 'projectowner' });
		testUserId = data.user.id;
		assert.ok(testUserId);
	});

	it('POST /projects creates a project', async () => {
		const data = await master.post('/projects', {
			name: 'Test Todo App',
			ownerId: testUserId,
			description: 'A simple todo app',
		});
		assert.ok(data.id);
		assert.strictEqual(data.name, 'Test Todo App');
		assert.strictEqual(data.ownerId, testUserId);
		assert.strictEqual(data.status, 'active');
		assert.strictEqual(data.description, 'A simple todo app');
		testProjectId = data.id;
	});

	it('POST /projects rejects without name', async () => {
		const resp = await fetch(`${master.url}/projects`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ownerId: testUserId }),
		});
		assert.strictEqual(resp.status, 400);
	});

	it('POST /projects rejects without ownerId', async () => {
		const resp = await fetch(`${master.url}/projects`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'No Owner' }),
		});
		assert.strictEqual(resp.status, 400);
	});

	it('GET /projects/:id returns the project', async () => {
		const data = await master.fetch(`/projects/${testProjectId}`);
		assert.strictEqual(data.id, testProjectId);
		assert.strictEqual(data.name, 'Test Todo App');
	});

	it('GET /projects/:id returns 404 for unknown', async () => {
		const resp = await fetch(`${master.url}/projects/nonexistent`);
		assert.strictEqual(resp.status, 404);
	});

	it('GET /projects lists projects for owner', async () => {
		// Create a second project
		await master.post('/projects', {
			name: 'Second Project',
			ownerId: testUserId,
		});

		const data = await master.fetch(`/projects?ownerId=${testUserId}`);
		assert.ok(Array.isArray(data.projects));
		assert.ok(data.projects.length >= 2);
		assert.ok(data.projects.every((p: any) => p.ownerId === testUserId));
	});

	it('GET /projects does not show other users projects', async () => {
		const other = await master.post('/auth/login', { username: 'otheruser' });
		await master.post('/projects', {
			name: 'Other User Project',
			ownerId: other.user.id,
		});

		const data = await master.fetch(`/projects?ownerId=${testUserId}`);
		assert.ok(data.projects.every((p: any) => p.ownerId === testUserId));
	});

	it('PATCH /projects/:id updates project', async () => {
		const resp = await fetch(`${master.url}/projects/${testProjectId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Updated Todo App', description: 'Updated description' }),
		});
		const data = await resp.json();
		assert.strictEqual(data.name, 'Updated Todo App');
		assert.strictEqual(data.description, 'Updated description');
	});

	it('DELETE /projects/:id archives project', async () => {
		const resp = await fetch(`${master.url}/projects/${testProjectId}`, {
			method: 'DELETE',
		});
		const data = await resp.json();
		assert.strictEqual(data.success, true);

		// Should no longer appear in active list
		const list = await master.fetch(`/projects?ownerId=${testUserId}`);
		assert.ok(!list.projects.find((p: any) => p.id === testProjectId));
	});

	it('GET /projects/:id still returns archived project', async () => {
		const data = await master.fetch(`/projects/${testProjectId}`);
		assert.strictEqual(data.status, 'archived');
	});
});
