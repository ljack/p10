import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('Master Health Endpoints', () => {
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	it('GET /health returns ok', async () => {
		const data = await master.fetch('/health');
		assert.strictEqual(data.status, 'ok');
		assert.ok(data.timestamp);
	});

	it('GET /status returns master info', async () => {
		const data = await master.fetch('/status');
		assert.strictEqual(data.master.status, 'running');
		assert.ok(data.master.uptime >= 0);
		assert.ok(Array.isArray(data.daemons));
	});

	it('GET /status shows no daemons initially', async () => {
		const data = await master.fetch('/status');
		assert.strictEqual(data.daemons.length, 0);
	});

	it('GET /board returns board snapshot', async () => {
		const data = await master.fetch('/board');
		assert.ok(data.stats.total >= 0);
		assert.ok(Array.isArray(data.planned));
		assert.ok(Array.isArray(data.done));
	});

	it('GET /events returns event history', async () => {
		const data = await master.fetch('/events');
		assert.ok(Array.isArray(data.events));
		assert.ok(data.stats);
	});

	it('GET /pipelines returns empty list', async () => {
		const data = await master.fetch('/pipelines');
		assert.ok(Array.isArray(data.active));
		assert.ok(Array.isArray(data.recent));
	});
});
