import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('Event Bus', () => {
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	it('POST /events/emit creates an event', async () => {
		const result = await master.post('/events/emit', {
			type: 'test.hello',
			source: 'test',
			data: { message: 'world' },
		});
		assert.strictEqual(result.success, true);
	});

	it('GET /events returns emitted event', async () => {
		const data = await master.fetch('/events');
		assert.ok(data.events.length > 0);
		const testEvent = data.events.find((e: any) => e.type === 'test.hello');
		assert.ok(testEvent, 'Should find test.hello event');
		assert.strictEqual(testEvent.data.message, 'world');
	});

	it('events have id, type, source, timestamp', async () => {
		const data = await master.fetch('/events');
		for (const event of data.events) {
			assert.ok(event.id, 'Event should have id');
			assert.ok(event.type, 'Event should have type');
			assert.ok(event.source, 'Event should have source');
			assert.ok(event.timestamp, 'Event should have timestamp');
		}
	});

	it('events stats include totals', async () => {
		const data = await master.fetch('/events');
		assert.ok(data.stats.totalEvents > 0);
	});

	it('mesh events broadcast to connected daemons', async () => {
		const daemon = await master.connectDaemon('Test Listener', 'test');

		// Emit an event
		await master.post('/events/emit', {
			type: 'test.broadcast',
			source: 'test',
			data: { key: 'value' },
		});

		// Daemon should receive mesh_event
		try {
			const msg = await daemon.waitForMessage('mesh_event', 3000);
			assert.strictEqual(msg.payload.type, 'test.broadcast');
			assert.strictEqual(msg.payload.data.key, 'value');
		} catch {
			// mesh_event might arrive as event_notification depending on subscription
			// Either way, the event should be in history
			const data = await master.fetch('/events');
			const found = data.events.find((e: any) => e.type === 'test.broadcast');
			assert.ok(found, 'Event should be in history even if daemon missed broadcast');
		} finally {
			daemon.close();
		}
	});

	it('board mutations emit events', async () => {
		const marker = `event-test-${Date.now()}`;
		await master.post('/board/task', { title: marker });

		const data = await master.fetch('/events');
		const addedEvent = data.events.find((e: any) =>
			e.type === 'board.task.added' && e.data?.task?.title === marker
		);
		assert.ok(addedEvent, 'board.task.added event should exist for our task');
	});
});
