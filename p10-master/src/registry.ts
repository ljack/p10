import type { DaemonRegistration, DaemonStatus, HeartbeatPayload, RegisterPayload } from './types.js';

const STALE_THRESHOLD = 15_000; // 15 seconds
const DEAD_THRESHOLD = 30_000;  // 30 seconds
const REAP_THRESHOLD = 60_000;  // 60 seconds — remove dead daemons after this

export class DaemonRegistry {
	private daemons = new Map<string, DaemonRegistration>();
	private checkInterval: NodeJS.Timeout | null = null;

	start() {
		// Check heartbeats every 5 seconds
		this.checkInterval = setInterval(() => this.checkHeartbeats(), 5000);
	}

	stop() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	register(id: string, payload: RegisterPayload): DaemonRegistration {
		// If a daemon with the same name+type already exists (reconnection),
		// remove the old registration to avoid duplicates
		for (const [existingId, existing] of this.daemons) {
			if (existingId !== id && existing.name === payload.name && existing.type === payload.type) {
				console.log(`[registry] Replacing stale registration: ${existingId} (${existing.name})`);
				this.daemons.delete(existingId);
			}
		}

		const registration: DaemonRegistration = {
			id,
			name: payload.name,
			type: payload.type,
			capabilities: payload.capabilities,
			lastHeartbeat: new Date().toISOString(),
			status: 'alive',
			tldr: `${payload.name} just registered`
		};
		this.daemons.set(id, registration);
		console.log(`[registry] Registered: ${id} (${payload.name}, ${payload.type})`);
		return registration;
	}

	unregister(id: string) {
		const daemon = this.daemons.get(id);
		if (daemon) {
			console.log(`[registry] Unregistered: ${id} (${daemon.name})`);
			this.daemons.delete(id);
		}
	}

	heartbeat(id: string, payload: HeartbeatPayload) {
		const daemon = this.daemons.get(id);
		if (!daemon) return;
		daemon.lastHeartbeat = new Date().toISOString();
		daemon.status = 'alive';
		daemon.tldr = payload.tldr;
		daemon.metrics = payload.metrics;
	}

	get(id: string): DaemonRegistration | undefined {
		return this.daemons.get(id);
	}

	getAll(): DaemonRegistration[] {
		return Array.from(this.daemons.values());
	}

	getAlive(): DaemonRegistration[] {
		return this.getAll().filter(d => d.status === 'alive');
	}

	getByType(type: string): DaemonRegistration[] {
		return this.getAll().filter(d => d.type === type);
	}

	/** Generate system-wide TLDR from all daemons */
	getSystemTldr(): string {
		const alive = this.getAlive();
		if (alive.length === 0) return 'No daemons connected.';

		const parts = alive.map(d => `[${d.name}] ${d.tldr}`);
		return `${alive.length} daemon(s) alive. ${parts.join(' | ')}`;
	}

	private checkHeartbeats() {
		const now = Date.now();
		const toReap: string[] = [];

		for (const daemon of this.daemons.values()) {
			const elapsed = now - new Date(daemon.lastHeartbeat).getTime();
			const prevStatus = daemon.status;

			if (elapsed > REAP_THRESHOLD) {
				// Dead long enough — remove entirely
				toReap.push(daemon.id);
				continue;
			} else if (elapsed > DEAD_THRESHOLD) {
				daemon.status = 'dead';
			} else if (elapsed > STALE_THRESHOLD) {
				daemon.status = 'stale';
			}

			if (daemon.status !== prevStatus) {
				console.log(`[registry] ${daemon.name} (${daemon.id}): ${prevStatus} → ${daemon.status}`);
			}
		}

		// Reap dead daemons
		for (const id of toReap) {
			const daemon = this.daemons.get(id);
			console.log(`[registry] Reaped dead daemon: ${daemon?.name} (${id})`);
			this.daemons.delete(id);
		}
	}
}
