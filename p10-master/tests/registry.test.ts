import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('Daemon Registry', () => {
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	it('daemon registration appears in /status', async () => {
		const daemon = await master.connectDaemon('Test Agent', 'pi', ['code.read']);

		const data = await master.fetch('/status');
		const found = data.daemons.find((d: any) => d.id === daemon.id);
		assert.ok(found, 'Registered daemon should appear in status');
		assert.strictEqual(found.name, 'Test Agent');
		assert.strictEqual(found.type, 'pi');
		assert.strictEqual(found.status, 'alive');

		daemon.close();
	});

	it('register_ack contains daemon id', async () => {
		const daemon = await master.connectDaemon('Ack Test', 'test');
		assert.ok(daemon.id, 'Should receive daemon ID from register_ack');
		assert.ok(daemon.id.length > 0);
		daemon.close();
	});

	it('heartbeat keeps daemon alive', async () => {
		const daemon = await master.connectDaemon('Heartbeat Test', 'test');

		// Send heartbeat
		daemon.send('master', 'heartbeat', {
			status: 'alive',
			tldr: 'testing heartbeat',
		});

		// Wait for pong
		const pong = await daemon.waitForMessage('pong', 3000);
		assert.ok(pong.payload.systemTldr);

		// Verify still alive
		const data = await master.fetch('/status');
		const found = data.daemons.find((d: any) => d.id === daemon.id);
		assert.ok(found);
		assert.strictEqual(found.status, 'alive');
		assert.strictEqual(found.tldr, 'testing heartbeat');

		daemon.close();
	});

	it('daemon dedup: same name+type re-register removes old', async () => {
		const d1 = await master.connectDaemon('Dedup Agent', 'pi');

		const statusBefore = await master.fetch('/status');
		const countBefore = statusBefore.daemons.filter((d: any) => d.name === 'Dedup Agent').length;
		assert.strictEqual(countBefore, 1);

		// Register another daemon with same name+type
		const d2 = await master.connectDaemon('Dedup Agent', 'pi');

		// Wait a moment for cleanup
		await new Promise(r => setTimeout(r, 500));

		const statusAfter = await master.fetch('/status');
		const countAfter = statusAfter.daemons.filter((d: any) => d.name === 'Dedup Agent').length;
		assert.strictEqual(countAfter, 1, 'Should deduplicate same name+type');

		d1.close();
		d2.close();
	});

	it('daemon disconnect removes from registry', async () => {
		const daemon = await master.connectDaemon('Disconnect Test', 'test');
		const id = daemon.id;

		// Verify registered
		let data = await master.fetch('/status');
		assert.ok(data.daemons.find((d: any) => d.id === id));

		// Disconnect
		daemon.close();
		await new Promise(r => setTimeout(r, 500));

		// Verify gone
		data = await master.fetch('/status');
		assert.ok(!data.daemons.find((d: any) => d.id === id), 'Should be removed after disconnect');
	});

	it('other daemons notified of join/leave', async () => {
		const listener = await master.connectDaemon('Listener', 'test');

		// Clear existing messages
		listener.messages.length = 0;

		// New daemon joins
		const joiner = await master.connectDaemon('Joiner', 'test');
		await new Promise(r => setTimeout(r, 300));

		const joinMsg = listener.messages.find(m => m.type === 'register' && m.payload?.daemon?.name === 'Joiner');
		assert.ok(joinMsg, 'Listener should be notified of new daemon');

		// Daemon leaves
		listener.messages.length = 0;
		joiner.close();
		await new Promise(r => setTimeout(r, 500));

		const leaveMsg = listener.messages.find(m => m.type === 'unregister');
		assert.ok(leaveMsg, 'Listener should be notified of daemon leaving');

		listener.close();
	});
});
