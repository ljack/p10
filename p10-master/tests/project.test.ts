import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('New Project', () => {
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	it('POST /project/new clears project tasks but keeps platform tasks', async () => {
		// Add a project task and a platform task
		await master.post('/board/task', { title: 'Project task', scope: 'project' });
		await master.post('/board/task', { title: 'Platform task', scope: 'platform' });

		const boardBefore = await master.fetch('/board');
		const projectBefore = [...boardBefore.planned, ...boardBefore.done, ...boardBefore['in-progress']]
			.filter((t: any) => t.scope !== 'platform').length;
		const platformBefore = [...boardBefore.planned, ...boardBefore.done, ...boardBefore['in-progress']]
			.filter((t: any) => t.scope === 'platform').length;

		assert.ok(projectBefore >= 1, 'Should have project tasks');
		assert.ok(platformBefore >= 1, 'Should have platform tasks');

		// Reset
		const result = await master.post('/project/new', {});
		assert.strictEqual(result.success, true);
		assert.ok(result.cleared.tasks >= 1);

		// Check board
		const boardAfter = await master.fetch('/board');
		const projectAfter = [...boardAfter.planned, ...boardAfter.done, ...boardAfter['in-progress']]
			.filter((t: any) => t.scope !== 'platform').length;
		const platformAfter = [...boardAfter.planned, ...boardAfter.done, ...boardAfter['in-progress']]
			.filter((t: any) => t.scope === 'platform').length;

		assert.strictEqual(projectAfter, 0, 'Project tasks should be cleared');
		assert.strictEqual(platformAfter, platformBefore, 'Platform tasks should survive');
	});

	it('POST /project/new clears pipeline history', async () => {
		const result = await master.post('/project/new', {});
		assert.strictEqual(result.success, true);

		const pipelines = await master.fetch('/pipelines');
		assert.strictEqual(pipelines.active.length, 0);
		assert.strictEqual(pipelines.recent.length, 0);
	});

	it('POST /project/new emits project.reset event', async () => {
		const daemon = await master.connectDaemon('Listener', 'test');
		// Clear messages from registration
		await new Promise(r => setTimeout(r, 500));
		daemon.messages.length = 0;

		await master.post('/project/new', {});
		await new Promise(r => setTimeout(r, 500));

		// Should receive mesh_event with project.reset
		const resetMsg = daemon.messages.find(m =>
			m.type === 'mesh_event' && m.payload?.type === 'project.reset'
		);
		assert.ok(resetMsg, 'Should receive project.reset mesh_event');

		daemon.close();
	});
});
