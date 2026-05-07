import type { DaemonRegistration, DaemonStatus, HeartbeatPayload, RegisterPayload } from './types.js';

const STALE_THRESHOLD = 15_000; // 15 seconds
const DEAD_THRESHOLD = 30_000;  // 30 seconds
const REAP_THRESHOLD = 60_000;  // 60 seconds — remove dead daemons after this

export interface RegisterResult {
	registration: DaemonRegistration;
	replaced: DaemonRegistration[];
}

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

	register(id: string, payload: RegisterPayload): RegisterResult {
		const replaced = this.removeDuplicateRegistrations(id, payload);

		const registration: DaemonRegistration = {
			id,
			name: payload.name,
			type: payload.type,
			capabilities: payload.capabilities,
			lastHeartbeat: new Date().toISOString(),
			status: 'alive',
			tldr: `${payload.name} just registered`,
			sessionId: payload.sessionId,
			pid: payload.pid,
		};
		this.daemons.set(id, registration);
		console.log(`[registry] Registered: ${id} (${payload.name}, ${payload.type})`);
		return { registration, replaced };
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

	/** Find registrations that would collide with a new registration. */
	private removeDuplicateRegistrations(id: string, payload: RegisterPayload): DaemonRegistration[] {
		const replaced: DaemonRegistration[] = [];
		const newPid = this.extractPid(id, payload);
		const newSessionId = payload.sessionId || id;

		for (const [existingId, existing] of this.daemons) {
			if (existingId === id) continue;
			if (existing.type !== payload.type) continue;

			const sameName = existing.name === payload.name;
			const sameSession = Boolean(existing.sessionId && existing.sessionId === newSessionId);
			const samePid = Boolean(newPid && this.extractPid(existing.id, existing) === newPid);

			if (sameName || sameSession || samePid) {
				console.log(`[registry] Replacing duplicate registration: ${existingId} (${existing.name})`);
				this.daemons.delete(existingId);
				replaced.push(existing);
			}
		}

		return replaced;
	}

	private extractPid(id: string, payload: Pick<DaemonRegistration, 'pid' | 'name'> | RegisterPayload): number | undefined {
		if (typeof payload.pid === 'number' && Number.isFinite(payload.pid)) {
			return payload.pid;
		}

		const match = id.match(/^pi-cli-(\d+)-/) || payload.name.match(/\bpid[^\d]*(\d+)\b/i);
		if (!match) return undefined;

		const pid = Number(match[1]);
		return Number.isFinite(pid) ? pid : undefined;
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
