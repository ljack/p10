import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('Task Board CRUD + Persistence', () => {
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	it('POST /board/task creates a task', async () => {
		const task = await master.post('/board/task', {
			title: 'Test task',
			description: 'A test task',
			priority: 'normal',
		});
		assert.ok(task.id);
		assert.strictEqual(task.title, 'Test task');
		assert.strictEqual(task.column, 'planned');
		assert.strictEqual(task.priority, 'normal');
	});

	it('GET /board contains the created task', async () => {
		const board = await master.fetch('/board');
		assert.ok(board.stats.total >= 1);
		const found = board.planned.find((t: any) => t.title === 'Test task');
		assert.ok(found, 'Board should contain the created task');
	});

	it('POST /board/task with scope=platform', async () => {
		const task = await master.post('/board/task', {
			title: 'Platform task',
			scope: 'platform',
			priority: 'high',
		});
		assert.strictEqual(task.scope, 'platform');
		assert.strictEqual(task.priority, 'high');
	});

	it('POST /board/task with subtasks', async () => {
		const task = await master.post('/board/task', {
			title: 'Pipeline task',
			pipelineId: 'pipe-123',
			subtasks: [
				{ id: 's1', role: 'api_agent', instruction: 'Build API', status: 'pending' },
				{ id: 's2', role: 'web_agent', instruction: 'Build UI', status: 'pending' },
			],
		});
		assert.strictEqual(task.pipelineId, 'pipe-123');
		assert.strictEqual(task.subtasks.length, 2);
		assert.strictEqual(task.subtasks[0].role, 'api_agent');
	});

	it('PATCH /board/task/:id moves task column', async () => {
		const board = await master.fetch('/board');
		const taskId = board.planned[0].id;

		const resp = await fetch(`${master.url}/board/task/${taskId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ column: 'in-progress' }),
		});
		const updated = await resp.json();
		assert.strictEqual(updated.column, 'in-progress');
		assert.ok(updated.startedAt);
	});

	it('DELETE /board/task/:id removes task', async () => {
		// Add a throwaway task
		const task = await master.post('/board/task', { title: 'Delete me' });
		const boardBefore = await master.fetch('/board');
		const countBefore = boardBefore.stats.total;

		const resp = await fetch(`${master.url}/board/task/${task.id}`, { method: 'DELETE' });
		const result = await resp.json();
		assert.strictEqual(result.removed, true);

		const boardAfter = await master.fetch('/board');
		assert.strictEqual(boardAfter.stats.total, countBefore - 1);
	});

	it('GET /board/column/planned filters by column', async () => {
		const planned = await master.fetch('/board/column/planned');
		assert.ok(Array.isArray(planned));
		for (const t of planned) {
			assert.strictEqual(t.column, 'planned');
		}
	});

	it('board persists to disk', async () => {
		// Add a task with a unique title
		const marker = `persist-${Date.now()}`;
		await master.post('/board/task', { title: marker });

		// Verify the file exists in data dir
		const { existsSync, readFileSync } = await import('fs');
		const { join } = await import('path');
		const boardFile = join(master.dataDir, 'board.json');
		assert.ok(existsSync(boardFile), 'board.json should exist');

		const data = JSON.parse(readFileSync(boardFile, 'utf-8'));
		const found = data.tasks.find((t: any) => t.title === marker);
		assert.ok(found, 'Task should be persisted in board.json');
	});
});
