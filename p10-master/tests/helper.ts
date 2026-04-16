/**
 * Test helper — starts a master daemon on a random port for isolated testing.
 * Each test file gets its own master instance.
 */

import { spawn, type ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import WebSocket from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER_DIR = join(__dirname, '..');

export interface TestMaster {
	port: number;
	url: string;
	wsUrl: string;
	dataDir: string;
	process: ChildProcess;
	/** Fetch a JSON endpoint */
	fetch: (path: string, options?: RequestInit) => Promise<any>;
	/** POST JSON to an endpoint */
	post: (path: string, body: any) => Promise<any>;
	/** Connect a WebSocket daemon, returns send/close helpers */
	connectDaemon: (name: string, type: string, capabilities?: string[]) => Promise<TestDaemon>;
	/** Stop the master and clean up */
	cleanup: () => void;
}

export interface TestDaemon {
	id: string;
	ws: WebSocket;
	messages: any[];
	send: (to: string, type: string, payload: any) => void;
	waitForMessage: (type: string, timeout?: number) => Promise<any>;
	close: () => void;
}

function randomPort(): number {
	return 10000 + Math.floor(Math.random() * 50000);
}

function makeId(): string {
	return Math.random().toString(36).slice(2, 10);
}

/**
 * Start a master daemon on a random port.
 * Returns helpers for HTTP + WebSocket interaction.
 */
export async function startMaster(): Promise<TestMaster> {
	const port = randomPort();
	const dataDir = mkdtempSync(join(tmpdir(), 'p10-test-'));

	const discoveryFile = join(dataDir, 'master.json');

	const proc = spawn('npx', ['tsx', 'src/index.ts'], {
		cwd: MASTER_DIR,
		env: {
			...process.env,
			P10_PORT: String(port),
			P10_DATA_DIR: dataDir,
			P10_HOME: dataDir, // isolate user/project storage
			P10_DISCOVERY_FILE: discoveryFile,
			P10_PROJECT_DIR: dataDir, // isolate from real PLAN.md
			P10_NO_INTEGRATIONS: '1',
		},
		stdio: 'pipe',
	});

	// Wait for master to be healthy
	const url = `http://localhost:${port}`;
	const wsUrl = `ws://localhost:${port}`;
	const maxWait = 15000;
	const start = Date.now();

	while (Date.now() - start < maxWait) {
		try {
			const resp = await fetch(`${url}/health`);
			if (resp.ok) break;
		} catch { /* not ready */ }
		await sleep(300);
	}

	// Verify it started
	try {
		const resp = await fetch(`${url}/health`);
		if (!resp.ok) throw new Error(`Master failed to start on port ${port}`);
	} catch (err: any) {
		proc.kill();
		throw new Error(`Master failed to start: ${err.message}`);
	}

	const fetchJson = async (path: string, options?: RequestInit) => {
		const resp = await fetch(`${url}${path}`, {
			...options,
			headers: { 'Content-Type': 'application/json', ...options?.headers },
		});
		return resp.json();
	};

	const postJson = async (path: string, body: any) => {
		return fetchJson(path, {
			method: 'POST',
			body: JSON.stringify(body),
		});
	};

	const connectDaemon = async (name: string, type: string, capabilities: string[] = []): Promise<TestDaemon> => {
		const daemonId = `test-${type}-${makeId()}`;
		const ws = new WebSocket(wsUrl);
		const messages: any[] = [];
		let resolveAck: ((msg: any) => void) | null = null;
		const waiters = new Map<string, { resolve: (msg: any) => void; timer: ReturnType<typeof setTimeout> }>();

		ws.on('message', (data: Buffer) => {
			try {
				const msg = JSON.parse(data.toString());
				messages.push(msg);

				if (msg.type === 'register_ack' && resolveAck) {
					resolveAck(msg);
					resolveAck = null;
				}

				// Resolve type-based waiters
				const waiter = waiters.get(msg.type);
				if (waiter) {
					waiters.delete(msg.type);
					clearTimeout(waiter.timer);
					waiter.resolve(msg);
				}
			} catch { /* ignore */ }
		});

		await new Promise<void>((resolve, reject) => {
			ws.on('open', resolve);
			ws.on('error', reject);
		});

		// Register
		const ackPromise = new Promise<any>((resolve) => { resolveAck = resolve; });
		ws.send(JSON.stringify({
			id: makeId(),
			from: daemonId,
			to: 'master',
			type: 'register',
			payload: { name, type, capabilities },
			timestamp: new Date().toISOString(),
		}));
		const ack = await ackPromise;
		const actualId = ack.payload?.id || daemonId;

		return {
			id: actualId,
			ws,
			messages,
			send(to: string, msgType: string, payload: any) {
				ws.send(JSON.stringify({
					id: makeId(),
					from: actualId,
					to,
					type: msgType,
					payload,
					timestamp: new Date().toISOString(),
				}));
			},
			waitForMessage(msgType: string, timeout = 5000): Promise<any> {
				// Check already received
				const existing = messages.find(m => m.type === msgType);
				if (existing) return Promise.resolve(existing);

				return new Promise((resolve, reject) => {
					const timer = setTimeout(() => {
						waiters.delete(msgType);
						reject(new Error(`Timeout waiting for message type: ${msgType}`));
					}, timeout);
					waiters.set(msgType, { resolve, timer });
				});
			},
			close() {
				ws.close();
			},
		};
	};

	const cleanup = () => {
		proc.kill('SIGTERM');
		try { rmSync(dataDir, { recursive: true, force: true }); } catch { /* ignore */ }
	};

	return { port, url, wsUrl, dataDir, process: proc, fetch: fetchJson, post: postJson, connectDaemon, cleanup };
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
