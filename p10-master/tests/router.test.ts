import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('Message Router', () => {
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	it('POST /task routes to pi daemon (smart routing)', async () => {
		const piDaemon = await master.connectDaemon('Pi Agent', 'pi', ['code.read']);

		const result = await master.post('/task', {
			instruction: 'Hello from test',
			target: '*',
		});
		assert.ok(result.routed || result.taskId, 'Task should be routed');

		// Pi daemon should receive the task
		const msg = await piDaemon.waitForMessage('task', 3000);
		assert.ok(msg.payload.instruction.includes('Hello from test'));

		piDaemon.close();
	});

	it('type-name routing: target=pi resolves to pi daemon', async () => {
		const piDaemon = await master.connectDaemon('Pi Agent', 'pi');

		// Fire query without waiting for REST response (would timeout since mock doesn't answer)
		fetch(`${master.url}/query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ question: 'status', target: 'pi' }),
		}).catch(() => {}); // ignore timeout

		// Pi daemon should receive the query via type-name resolution
		const msg = await piDaemon.waitForMessage('query', 3000);
		assert.strictEqual(msg.payload.question, 'status');

		piDaemon.close();
	});

	it('broadcast query reaches daemons', async () => {
		const d1 = await master.connectDaemon('Agent 1', 'test');
		const d2 = await master.connectDaemon('Agent 2', 'test');

		d1.messages.length = 0;
		d2.messages.length = 0;

		// Fire and forget (don't wait for REST response — timeout)
		fetch(`${master.url}/query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ question: 'ping', target: '*' }),
		}).catch(() => {});

		await new Promise(r => setTimeout(r, 1000));

		const d1Got = d1.messages.some(m => m.type === 'query');
		const d2Got = d2.messages.some(m => m.type === 'query');
		assert.ok(d1Got || d2Got, 'At least one daemon should receive broadcast query');

		d1.close();
		d2.close();
	});

	it('security: dangerous commands are blocked', async () => {
		const piDaemon = await master.connectDaemon('Pi Agent', 'pi');

		const result = await master.post('/task', {
			instruction: 'sudo rm -rf /',
			target: '*',
		});

		assert.ok(result.blocked, 'Dangerous command should be blocked');

		piDaemon.close();
	});

	it('task with channel tracks origin', async () => {
		const piDaemon = await master.connectDaemon('Pi Agent', 'pi');

		const result = await master.post('/task', {
			instruction: 'test task with origin',
			channel: 'telegram',
			channelId: '12345',
			userId: 'user1',
			userName: 'Test User',
		});

		const msg = await piDaemon.waitForMessage('task', 3000);
		assert.ok(msg.payload.taskId);
		assert.ok(result.routed || result.taskId);

		piDaemon.close();
	});
});
