import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('Project-Scoped Data', () => {
	let master: TestMaster;
	let userId: string;
	let projectId: string;

	before(async () => {
		master = await startMaster();

		// Create user + project
		const user = await master.post('/auth/login', { username: 'datatest' });
		userId = user.user.id;

		const project = await master.post('/projects', {
			name: 'Data Test Project',
			ownerId: userId,
		});
		projectId = project.id;
	});

	after(() => {
		master?.cleanup();
	});

	// --- Project Board ---

	it('GET /projects/:id/board returns empty board', async () => {
		const data = await master.fetch(`/projects/${projectId}/board`);
		assert.strictEqual(data.stats.total, 0);
		assert.ok(Array.isArray(data.planned));
		assert.ok(Array.isArray(data.done));
	});

	it('POST /projects/:id/board/task creates task', async () => {
		const data = await master.post(`/projects/${projectId}/board/task`, {
			title: 'Build login page',
			priority: 'high',
		});
		assert.ok(data.id);
		assert.strictEqual(data.title, 'Build login page');
		assert.strictEqual(data.column, 'planned');
		assert.strictEqual(data.priority, 'high');
	});

	it('GET /projects/:id/board shows created task', async () => {
		const data = await master.fetch(`/projects/${projectId}/board`);
		assert.strictEqual(data.stats.total, 1);
		assert.strictEqual(data.planned.length, 1);
		assert.strictEqual(data.planned[0].title, 'Build login page');
	});

	it('PATCH /projects/:id/board/task/:id moves task', async () => {
		const board = await master.fetch(`/projects/${projectId}/board`);
		const taskId = board.planned[0].id;

		const resp = await fetch(`${master.url}/projects/${projectId}/board/task/${taskId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ column: 'in-progress' }),
		});
		const data = await resp.json();
		assert.strictEqual(data.column, 'in-progress');
	});

	it('DELETE /projects/:id/board/task/:id removes task', async () => {
		// Add and then delete a task
		const task = await master.post(`/projects/${projectId}/board/task`, {
			title: 'Temp task',
		});
		const resp = await fetch(`${master.url}/projects/${projectId}/board/task/${task.id}`, {
			method: 'DELETE',
		});
		const data = await resp.json();
		assert.strictEqual(data.success, true);
	});

	// --- Project Isolation ---

	it('different projects have isolated boards', async () => {
		const project2 = await master.post('/projects', {
			name: 'Isolated Project',
			ownerId: userId,
		});

		// Add task to project 2
		await master.post(`/projects/${project2.id}/board/task`, {
			title: 'Project 2 task',
		});

		// Project 1 should not see project 2's task
		const board1 = await master.fetch(`/projects/${projectId}/board`);
		const board2 = await master.fetch(`/projects/${project2.id}/board`);

		assert.ok(!board1.planned.find((t: any) => t.title === 'Project 2 task'));
		assert.ok(board2.planned.find((t: any) => t.title === 'Project 2 task'));
	});

	// --- Pipelines ---

	it('GET /projects/:id/pipelines returns empty', async () => {
		const data = await master.fetch(`/projects/${projectId}/pipelines`);
		assert.ok(Array.isArray(data.active));
		assert.ok(Array.isArray(data.recent));
	});

	// --- Container Snapshot ---

	it('POST /projects/:id/container-snapshot saves files', async () => {
		const data = await master.post(`/projects/${projectId}/container-snapshot`, {
			files: {
				'index.html': '<h1>Hello</h1>',
				'src/app.js': 'console.log("hello")',
			},
		});
		assert.strictEqual(data.success, true);
		assert.strictEqual(data.fileCount, 2);
	});

	it('GET /projects/:id/container-snapshot loads files', async () => {
		const data = await master.fetch(`/projects/${projectId}/container-snapshot`);
		assert.ok(data.files);
		assert.strictEqual(data.files['index.html'], '<h1>Hello</h1>');
		assert.strictEqual(data.files['src/app.js'], 'console.log("hello")');
	});

	// --- Reset ---

	it('POST /projects/:id/reset clears project data', async () => {
		// Add some data
		await master.post(`/projects/${projectId}/board/task`, { title: 'Will be cleared' });

		const data = await master.post(`/projects/${projectId}/reset`, {});
		assert.ok(data.tasksCleared >= 1);

		const board = await master.fetch(`/projects/${projectId}/board`);
		// Only platform tasks should remain (none in test)
		assert.strictEqual(board.planned.length, 0);
	});

	// --- 404 for unknown project ---

	it('returns 404 for unknown project data', async () => {
		const resp = await fetch(`${master.url}/projects/nonexistent/board`);
		assert.strictEqual(resp.status, 404);
	});
});
