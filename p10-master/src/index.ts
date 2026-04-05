import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { writeFileSync, unlinkSync } from 'fs';
import { DaemonRegistry } from './registry.js';
import { MessageRouter } from './router.js';
import { MASTER_DISCOVERY_FILE, DEFAULT_PORT, makeId } from './types.js';
import type { DaemonMessage, RegisterPayload, HeartbeatPayload } from './types.js';

const PORT = parseInt(process.env.P10_PORT || String(DEFAULT_PORT));

const registry = new DaemonRegistry();
const router = new MessageRouter();

// HTTP server for health/status
const httpServer = createServer((req, res) => {
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Access-Control-Allow-Origin', '*');

	if (req.url === '/health') {
		res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
		return;
	}

	if (req.url === '/status') {
		const daemons = registry.getAll();
		res.end(JSON.stringify({
			master: { status: 'running', port: PORT, uptime: process.uptime() },
			daemons,
			systemTldr: registry.getSystemTldr(),
			timestamp: new Date().toISOString()
		}, null, 2));
		return;
	}

	if (req.url === '/tldr') {
		res.end(JSON.stringify({ tldr: registry.getSystemTldr() }));
		return;
	}

	res.statusCode = 404;
	res.end(JSON.stringify({ error: 'Not found' }));
});

// WebSocket server
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws: WebSocket) => {
	let daemonId: string | null = null;

	ws.on('message', (data: Buffer) => {
		let message: DaemonMessage;
		try {
			message = JSON.parse(data.toString());
		} catch {
			ws.send(JSON.stringify({ type: 'error', payload: { error: 'Invalid JSON' } }));
			return;
		}

		switch (message.type) {
			case 'register': {
				const payload = message.payload as RegisterPayload;
				daemonId = message.from || makeId();
				const reg = registry.register(daemonId, payload);
				router.addConnection(daemonId, ws);

				// Send ack with assigned ID
				ws.send(JSON.stringify({
					id: makeId(),
					from: 'master',
					to: daemonId,
					type: 'register_ack',
					payload: { id: daemonId, registration: reg },
					timestamp: new Date().toISOString()
				}));

				// Notify others
				router.broadcast({
					id: makeId(),
					from: 'master',
					to: '*',
					type: 'register',
					payload: { daemon: reg },
					timestamp: new Date().toISOString()
				}, daemonId);

				console.log(`[master] ✅ ${payload.name} connected (${daemonId})`);
				break;
			}

			case 'heartbeat': {
				if (daemonId) {
					registry.heartbeat(daemonId, message.payload as HeartbeatPayload);
				}
				// Respond with pong + system TLDR
				ws.send(JSON.stringify({
					id: makeId(),
					from: 'master',
					to: daemonId || message.from,
					type: 'pong',
					payload: {
						systemTldr: registry.getSystemTldr(),
						daemons: registry.getAlive().map(d => ({ id: d.id, name: d.name, type: d.type, status: d.status }))
					},
					timestamp: new Date().toISOString()
				}));
				break;
			}

			case 'state_request': {
				// Request state from a specific daemon
				if (message.to && message.to !== 'master') {
					router.route(message);
				} else {
					// Return master state
					ws.send(JSON.stringify({
						id: makeId(),
						from: 'master',
						to: message.from,
						type: 'state_snapshot',
						payload: {
							daemons: registry.getAll(),
							systemTldr: registry.getSystemTldr()
						},
						timestamp: new Date().toISOString()
					}));
				}
				break;
			}

			default: {
				// Route to target daemon
				if (message.to && message.to !== 'master') {
					const result = router.route(message);
					if (!result.routed && result.blocked) {
						ws.send(JSON.stringify({
							id: makeId(),
							from: 'master',
							to: message.from,
							type: 'error',
							payload: { error: result.blocked, originalId: message.id },
							timestamp: new Date().toISOString()
						}));
					}
				}
				break;
			}
		}
	});

	ws.on('close', () => {
		if (daemonId) {
			const daemon = registry.get(daemonId);
			console.log(`[master] ❌ ${daemon?.name || daemonId} disconnected`);
			router.removeConnection(daemonId);
			registry.unregister(daemonId);

			// Notify others
			router.broadcast({
				id: makeId(),
				from: 'master',
				to: '*',
				type: 'unregister',
				payload: { id: daemonId },
				timestamp: new Date().toISOString()
			});
		}
	});

	ws.on('error', (err) => {
		console.error(`[master] WebSocket error:`, err.message);
	});
});

// Start
registry.start();

httpServer.listen(PORT, () => {
	console.log(`\n  ┌──────────────────────────────────────┐`);
	console.log(`  │  P10 Master Daemon                    │`);
	console.log(`  │  WebSocket: ws://localhost:${PORT}       │`);
	console.log(`  │  HTTP:      http://localhost:${PORT}      │`);
	console.log(`  │  Status:    http://localhost:${PORT}/status│`);
	console.log(`  └──────────────────────────────────────┘\n`);

	// Write discovery file
	writeFileSync(MASTER_DISCOVERY_FILE, JSON.stringify({
		wsUrl: `ws://localhost:${PORT}`,
		httpUrl: `http://localhost:${PORT}`,
		pid: process.pid,
		startedAt: new Date().toISOString()
	}, null, 2));
	console.log(`  Discovery file: ${MASTER_DISCOVERY_FILE}`);
});

// Cleanup on exit
function cleanup() {
	console.log('\n[master] Shutting down...');
	registry.stop();
	try { unlinkSync(MASTER_DISCOVERY_FILE); } catch { /* ignore */ }
	wss.close();
	httpServer.close();
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
