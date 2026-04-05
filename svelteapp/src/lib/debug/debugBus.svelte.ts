/**
 * P10 Debug Bus — central observability layer
 * 
 * Architecture:
 * ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
 * │ Browser      │───▶│  Debug Bus    │───▶│ Debug Server │
 * │ (P10 app)    │    │ (in-memory)  │    │ (SvelteKit)  │
 * │              │    │              │    │              │
 * │ • Container  │    │ • Event log  │    │ • /api/debug │
 * │ • Chat       │    │ • State snap │    │ • WebSocket  │
 * │ • ApiExplorer│    │ • TLDR gen   │    │ • Log file   │
 * │ • Bridge     │    │              │    │              │
 * └─────────────┘    └──────────────┘    └──────────────┘
 *                                              │
 *                                              ▼
 *                                        ┌──────────────┐
 *                                        │ CLI Agent    │
 *                                        │ (pi)         │
 *                                        │              │
 *                                        │ • curl /debug│
 *                                        │ • tail log   │
 *                                        │ • ws connect │
 *                                        └──────────────┘
 */

export type DebugLevel = 'info' | 'warn' | 'error' | 'event';

export interface DebugEvent {
	timestamp: string;
	level: DebugLevel;
	source: string; // container, chat, api-explorer, bridge, agent, git
	event: string;
	data?: any;
}

export interface StateSnapshot {
	timestamp: string;
	container: {
		status: string;
		serverStatus: string;
		servers: Array<{ port: number; url: string; type: string }>;
		error: string | null;
	};
	chat: {
		messageCount: number;
		lastUserMessage: string | null;
		lastAgentMessage: string | null;
		isStreaming: boolean;
		hasApiKey: boolean;
	};
	apiExplorer: {
		discoveredRoutes: Array<{ methods: string[]; path: string }>;
		lastRequest: string | null;
		lastResponse: { status: number; body: string } | null;
	};
	errors: string[];
	specs: Array<{ filename: string; status: string; length: number }>;
	git: {
		commitCount: number;
		lastCommit: string | null;
	};
	/** One-paragraph summary of current system state for the CLI agent */
	tldr: string;
}

const MAX_EVENTS = 200;

class DebugBus {
	events = $state<DebugEvent[]>([]);
	private wsConnections: Set<(data: string) => void> = new Set();

	// Snapshot providers — registered by each component
	private snapshotProviders: Map<string, () => any> = new Map();

	/** Log a debug event */
	log(level: DebugLevel, source: string, event: string, data?: any) {
		const entry: DebugEvent = {
			timestamp: new Date().toISOString(),
			level,
			source,
			event,
			data: data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined
		};

		this.events = [...this.events.slice(-(MAX_EVENTS - 1)), entry];

		// Broadcast to WebSocket listeners
		const line = `[${entry.timestamp}] [${entry.level}] [${entry.source}] ${entry.event}${entry.data ? ' | ' + entry.data : ''}`;
		this.wsConnections.forEach((send) => {
			try { send(line); } catch { /* ignore */ }
		});

		// Also push to server log endpoint (fire and forget)
		this.pushToServer(entry);
	}

	/** Register a component's state provider for snapshots */
	registerProvider(name: string, provider: () => any) {
		this.snapshotProviders.set(name, provider);
	}

	/** Generate a full state snapshot */
	getSnapshot(): StateSnapshot {
		const providers: Record<string, any> = {};
		this.snapshotProviders.forEach((fn, name) => {
			try { providers[name] = fn(); } catch { providers[name] = { error: 'provider failed' }; }
		});

		const container = providers.container || { status: 'unknown', serverStatus: 'unknown', servers: [], error: null };
		const chat = providers.chat || { messageCount: 0, lastUserMessage: null, lastAgentMessage: null, isStreaming: false, hasApiKey: false };
		const apiExplorer = providers.apiExplorer || { discoveredRoutes: [], lastRequest: null, lastResponse: null };
		const errors = providers.errors || [];
		const specs = providers.specs || [];
		const git = providers.git || { commitCount: 0, lastCommit: null };

		// Generate TLDR
		const tldr = this.generateTldr(container, chat, apiExplorer, errors);

		return {
			timestamp: new Date().toISOString(),
			container,
			chat,
			apiExplorer,
			errors,
			specs,
			git,
			tldr
		};
	}

	/** Generate a human-readable summary */
	private generateTldr(container: any, chat: any, apiExplorer: any, errors: string[]): string {
		const parts: string[] = [];

		// Container status
		if (container.status === 'ready' && container.servers?.length > 0) {
			parts.push(`Container running with ${container.servers.length} server(s)`);
		} else if (container.status === 'booting') {
			parts.push('Container is booting');
		} else if (container.status === 'error') {
			parts.push(`Container error: ${container.error}`);
		} else {
			parts.push(`Container: ${container.status}`);
		}

		// Chat
		if (chat.isStreaming) {
			parts.push('Agent is currently streaming a response');
		} else if (chat.messageCount > 1) {
			parts.push(`Chat has ${chat.messageCount} messages`);
		}
		if (!chat.hasApiKey) {
			parts.push('NO API KEY SET');
		}

		// API Explorer
		if (apiExplorer.discoveredRoutes?.length > 0) {
			parts.push(`API Explorer: ${apiExplorer.discoveredRoutes.length} routes discovered`);
		} else {
			parts.push('API Explorer: no routes discovered');
		}

		// Errors
		if (errors.length > 0) {
			parts.push(`⚠️ ${errors.length} error(s): ${errors[0]?.substring(0, 80)}`);
		}

		return parts.join('. ') + '.';
	}

	/** Get recent events as formatted log */
	getRecentLog(count = 50): string {
		return this.events
			.slice(-count)
			.map((e) => `[${e.timestamp}] [${e.level}] [${e.source}] ${e.event}${e.data ? ' | ' + e.data : ''}`)
			.join('\n');
	}

	/** Register a WebSocket listener */
	addWsListener(send: (data: string) => void): () => void {
		this.wsConnections.add(send);
		return () => this.wsConnections.delete(send);
	}

	/** Push event to server for file logging */
	private async pushToServer(entry: DebugEvent) {
		try {
			await fetch('/api/debug/log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(entry)
			});
		} catch {
			// Ignore — debug logging should never break the app
		}
	}
}

export const debugBus = new DebugBus();
