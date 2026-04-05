/**
 * WebSocket client for Pi Daemon — Node.js version using the ws library.
 */

import WebSocket from 'ws';

export type MessageHandler = (message: any) => void;

interface WsClientOptions {
	url: string;
	daemonId: string;
	name: string;
	type: string;
	capabilities: string[];
	heartbeatInterval?: number;
}

export class WsClient {
	private ws: WebSocket | null = null;
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private options: WsClientOptions;
	private registered = false;
	private messageHandlers = new Set<MessageHandler>();
	private getTldr: () => string = () => 'no status';

	connected = false;
	daemonId: string;

	constructor(options: WsClientOptions) {
		this.options = options;
		this.daemonId = options.daemonId;
	}

	setTldrProvider(fn: () => string) {
		this.getTldr = fn;
	}

	onMessage(handler: MessageHandler): () => void {
		this.messageHandlers.add(handler);
		return () => this.messageHandlers.delete(handler);
	}

	connect() {
		if (this.ws?.readyState === WebSocket.OPEN) return;

		try {
			this.ws = new WebSocket(this.options.url);

			this.ws.on('open', () => {
				console.log(`[pi-daemon] Connected to Master`);
				this.connected = true;
				this.register();
				this.startHeartbeat();
			});

			this.ws.on('message', (data: Buffer) => {
				try {
					const message = JSON.parse(data.toString());
					this.handleMessage(message);
				} catch { /* ignore */ }
			});

			this.ws.on('close', () => {
				console.log(`[pi-daemon] Disconnected from Master`);
				this.connected = false;
				this.registered = false;
				this.stopHeartbeat();
				this.scheduleReconnect();
			});

			this.ws.on('error', () => {
				// Will trigger close
			});
		} catch {
			this.scheduleReconnect();
		}
	}

	disconnect() {
		this.stopHeartbeat();
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.connected = false;
	}

	send(to: string, type: string, payload: any) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		this.ws.send(JSON.stringify({
			id: makeId(),
			from: this.daemonId,
			to,
			type,
			payload,
			timestamp: new Date().toISOString()
		}));
	}

	async query(target: string, question: string, timeout = 30000): Promise<any> {
		return new Promise((resolve, reject) => {
			const queryId = makeId();
			const timer = setTimeout(() => {
				cleanup();
				reject(new Error('Query timeout'));
			}, timeout);

			const cleanup = this.onMessage((msg) => {
				if (msg.type === 'query_response' && msg.payload?.queryId === queryId) {
					clearTimeout(timer);
					cleanup();
					resolve(msg.payload.answer);
				}
			});

			this.send(target, 'query', { queryId, question });
		});
	}

	private register() {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		this.ws.send(JSON.stringify({
			id: makeId(),
			from: this.daemonId,
			to: 'master',
			type: 'register',
			payload: {
				name: this.options.name,
				type: this.options.type,
				capabilities: this.options.capabilities
			},
			timestamp: new Date().toISOString()
		}));
	}

	private handleMessage(message: any) {
		if (message.type === 'register_ack') {
			this.registered = true;
			if (message.payload?.id) {
				this.daemonId = message.payload.id;
			}
			console.log(`[pi-daemon] Registered as ${this.daemonId}`);
		}

		this.messageHandlers.forEach((handler) => {
			try { handler(message); } catch { /* ignore */ }
		});
	}

	private startHeartbeat() {
		this.stopHeartbeat();
		const interval = this.options.heartbeatInterval || 5000;
		this.heartbeatTimer = setInterval(() => {
			this.send('master', 'heartbeat', {
				status: 'alive',
				tldr: this.getTldr()
			});
		}, interval);
	}

	private stopHeartbeat() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	private scheduleReconnect() {
		if (this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			console.log('[pi-daemon] Reconnecting...');
			this.connect();
		}, 5000);
	}
}

function makeId(): string {
	return Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}
