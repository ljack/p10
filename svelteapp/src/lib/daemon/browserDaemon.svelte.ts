/**
 * Browser Daemon — runs in the P10 web app, connects to Master Daemon.
 * 
 * Capabilities:
 * - Container file read/write/command
 * - Preview state monitoring
 * - API endpoint discovery
 * - Error detection and auto-fix
 * - Chat message sending
 * - State snapshots
 */

import { WsClient } from './wsClient';
import { debugBus } from '$lib/debug/debugBus.svelte';
import { getState as getContainerState, getInstance } from '$lib/sandbox/container';
import { errorStore } from '$lib/stores/errors.svelte';
import { settings } from '$lib/stores/settings.svelte';
import { startAutonomousWatch, stopAutonomousWatch } from './autonomousAgent';

/** Try to discover Master Daemon URL from well-known file or default */
function discoverMasterUrl(): string {
	// In browser, we can't read /tmp/p10-master.json directly.
	// Use a SvelteKit API endpoint to read it for us.
	return 'ws://localhost:7777'; // Default, will be replaced by discovery endpoint
}

const MASTER_WS_URL = discoverMasterUrl();
const DAEMON_ID = 'browser-' + Math.random().toString(36).slice(2, 6);

class BrowserDaemon {
	private client: WsClient | null = null;
	connected = $state(false);
	masterTldr = $state('');

	/** Start the daemon and connect to Master */
	async start() {
		if (this.client) return;

		// Auto-discover Master Daemon
		let masterUrl = MASTER_WS_URL;
		try {
			const res = await fetch('/api/mesh');
			const data = await res.json();
			if (data.available && data.wsUrl) {
				masterUrl = data.wsUrl;
				debugBus.log('event', 'daemon', `Discovered Master at ${masterUrl}`);
			} else {
				debugBus.log('info', 'daemon', 'Master Daemon not found, will retry connection');
			}
		} catch {
			debugBus.log('info', 'daemon', 'Discovery endpoint unavailable, using default');
		}

		this.client = new WsClient({
			url: masterUrl,
			daemonId: DAEMON_ID,
			name: 'P10 Browser',
			type: 'browser',
			capabilities: [
				'container.read_file',
				'container.write_file',
				'container.run_command',
				'container.list_files',
				'preview.get_state',
				'preview.get_errors',
				'api_explorer.discover_routes',
				'chat.get_history',
				'state.get_snapshot'
			],
			onConnect: () => {
				this.connected = true;
				debugBus.log('event', 'daemon', 'Connected to Master Daemon');
				startAutonomousWatch();
			},
			onDisconnect: () => {
				this.connected = false;
				debugBus.log('event', 'daemon', 'Disconnected from Master Daemon');
				stopAutonomousWatch();
			}
		});

		// Set TLDR provider
		this.client.setTldrProvider(() => this.generateTldr());

		// Handle incoming messages
		this.client.onMessage((msg) => this.handleMessage(msg));

		// Connect (will auto-reconnect on failure)
		this.client.connect();

		debugBus.log('event', 'daemon', `Browser Daemon started (${DAEMON_ID})`);
	}

	/** Stop the daemon */
	stop() {
		this.client?.disconnect();
		this.client = null;
		this.connected = false;
	}

	/** Send a message to another daemon via Master */
	send(to: string, type: string, payload: any) {
		this.client?.send(to, type, payload);
	}

	/** Query another daemon */
	async query(target: string, question: string): Promise<any> {
		return this.client?.query(target, question);
	}

	/** Handle incoming messages from other daemons */
	private async handleMessage(msg: any) {
		switch (msg.type) {
			case 'pong': {
				// Master heartbeat response with system TLDR
				this.masterTldr = msg.payload?.systemTldr || '';
				break;
			}

			case 'state_request': {
				// Another daemon wants our state
				const snapshot = debugBus.getSnapshot();
				this.client?.send(msg.from, 'state_snapshot', snapshot);
				break;
			}

			case 'query': {
				const answer = await this.handleQuery(msg.payload?.question);
				this.client?.send(msg.from, 'query_response', {
					queryId: msg.payload?.queryId,
					answer
				});
				break;
			}

			case 'task': {
				const result = await this.handleTask(msg.payload);
				this.client?.send(msg.from, 'task_result', {
					taskId: msg.payload?.taskId,
					result
				});
				break;
			}

			case 'register': {
				// Another daemon joined
				debugBus.log('event', 'daemon', `Daemon joined: ${msg.payload?.daemon?.name}`);
				break;
			}

			case 'unregister': {
				debugBus.log('event', 'daemon', `Daemon left: ${msg.payload?.id}`);
				break;
			}
		}
	}

	/** Handle queries from other daemons */
	private async handleQuery(question: string): Promise<string> {
		const q = question?.toLowerCase() || '';

		if (q.includes('state') || q.includes('status') || q.includes('snapshot')) {
			return JSON.stringify(debugBus.getSnapshot());
		}

		if (q.includes('error')) {
			return errorStore.getContext() || 'No errors';
		}

		if (q.includes('file') && q.includes('list')) {
			const container = getInstance();
			if (!container) return 'Container not ready';
			try {
				const entries = await container.fs.readdir('.', { withFileTypes: true });
				return entries
					.filter((e) => e.name !== 'node_modules')
					.map((e) => e.isDirectory() ? e.name + '/' : e.name)
					.join('\n');
			} catch {
				return 'Failed to list files';
			}
		}

		if (q.includes('read') && q.includes('file')) {
			// Extract filename from query
			const match = question.match(/read\s+file\s+(\S+)/i);
			if (match) {
				const container = getInstance();
				if (!container) return 'Container not ready';
				try {
					return await container.fs.readFile(match[1], 'utf-8');
				} catch {
					return `File not found: ${match[1]}`;
				}
			}
			return 'Specify a file path';
		}

		return `Unknown query: ${question}`;
	}

	/** Handle tasks from other daemons */
	private async handleTask(payload: any): Promise<any> {
		const instruction = payload?.instruction || '';

		if (instruction.includes('write_file')) {
			const container = getInstance();
			if (!container) return { error: 'Container not ready' };
			try {
				const { path, content } = payload;
				const dir = path.split('/').slice(0, -1).join('/');
				if (dir) await container.fs.mkdir(dir, { recursive: true });
				await container.fs.writeFile(path, content);
				return { success: true, path, bytes: content.length };
			} catch (err: any) {
				return { error: err.message };
			}
		}

		if (instruction.includes('run_command')) {
			const container = getInstance();
			if (!container) return { error: 'Container not ready' };
			try {
				const parts = payload.command.split(' ');
				const proc = await container.spawn(parts[0], parts.slice(1));
				let output = '';
				proc.output.pipeTo(new WritableStream({ write(c) { output += c; } }));
				const code = await Promise.race([
					proc.exit,
					new Promise<number>((r) => setTimeout(() => r(-1), 30000))
				]);
				return { exitCode: code, output: output.slice(0, 2000) };
			} catch (err: any) {
				return { error: err.message };
			}
		}

		return { error: `Unknown instruction: ${instruction}` };
	}

	/** Generate TLDR for heartbeat */
	private generateTldr(): string {
		const containerState = getContainerState();
		const errors = errorStore.errors;
		const parts: string[] = [];

		// Container
		if (containerState.status === 'ready' && containerState.servers.length > 0) {
			parts.push(`${containerState.servers.length} server(s) running`);
		} else {
			parts.push(`container: ${containerState.status}`);
		}

		// API key
		if (!settings.apiKey) {
			parts.push('no API key');
		}

		// Errors
		if (errors.length > 0) {
			parts.push(`${errors.length} error(s)`);
		}

		return parts.join(', ');
	}
}

export const browserDaemon = new BrowserDaemon();
