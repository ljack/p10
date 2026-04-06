/**
 * P10 Mesh Event Bus — Distributed event system for autonomous mesh reactions
 * 
 * Architecture:
 * ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
 * │ Pi CLI      │───▶│ Event Hub     │───▶│ All Mesh     │
 * │ Extensions  │    │ (Master)     │    │ Participants │
 * │ • heartbeat │    │ • routing    │    │ • reactions  │
 * │ • state     │    │ • filtering  │    │ • updates    │
 * │ • events    │    │ • logging    │    │ • sync       │
 * └─────────────┘    └──────────────┘    └──────────────┘
 * 
 * Event Types:
 * - mesh.* — System events (daemon join/leave, pi CLI connect/quit)
 * - state.* — State changes (container ready, file changed, build complete)
 * - task.* — Task lifecycle (started, progress, completed, failed)
 * - user.* — User interactions (input needed, approved, cancelled)
 * - dev.* — Development events (code change, test run, deploy)
 */

import type { DaemonRegistry } from './registry.js';
import type { MessageRouter } from './router.js';
import { makeId } from './types.js';

export interface MeshEvent {
	id: string;
	type: string; // 'mesh.daemon.joined', 'state.container.ready', 'task.completed'
	source: string; // daemon ID or session ID that generated the event
	data: any;
	timestamp: string;
	scope?: 'broadcast' | 'pi' | 'browser' | 'telegram'; // optional targeting
}

export interface EventSubscription {
	id: string;
	daemonId: string;
	pattern: string; // glob pattern like 'task.*' or 'state.container.*'
	handler: string; // capability name that handles the event
}

const MAX_EVENT_HISTORY = 500;

export class MeshEventBus {
	private events: MeshEvent[] = [];
	private subscriptions = new Map<string, EventSubscription[]>(); // daemonId -> subscriptions
	private registry: DaemonRegistry;
	private router: MessageRouter;

	constructor(registry: DaemonRegistry, router: MessageRouter) {
		this.registry = registry;
		this.router = router;
	}

	/** Emit an event to the mesh */
	emit(type: string, source: string, data: any, scope?: MeshEvent['scope']) {
		const event: MeshEvent = {
			id: makeId(),
			type,
			source,
			data,
			timestamp: new Date().toISOString(),
			scope
		};

		// Store event in history
		this.events.push(event);
		if (this.events.length > MAX_EVENT_HISTORY) {
			this.events = this.events.slice(-MAX_EVENT_HISTORY);
		}

		console.log(`[event-bus] 📡 ${type} from ${source}`);

		// Route event to subscribers
		this.routeEvent(event);

		// Also broadcast as regular daemon message for backward compatibility
		this.router.broadcast({
			id: makeId(),
			from: 'master',
			to: '*',
			type: 'mesh_event',
			payload: event,
			timestamp: event.timestamp
		});
	}

	/** Subscribe a daemon to event patterns */
	subscribe(daemonId: string, pattern: string, handler: string) {
		if (!this.subscriptions.has(daemonId)) {
			this.subscriptions.set(daemonId, []);
		}

		const subscription: EventSubscription = {
			id: makeId(),
			daemonId,
			pattern,
			handler
		};

		this.subscriptions.get(daemonId)!.push(subscription);
		console.log(`[event-bus] 📋 ${daemonId} subscribed to ${pattern}`);
		return subscription.id;
	}

	/** Unsubscribe from events */
	unsubscribe(daemonId: string, subscriptionId?: string) {
		const subs = this.subscriptions.get(daemonId);
		if (!subs) return;

		if (subscriptionId) {
			const index = subs.findIndex(s => s.id === subscriptionId);
			if (index >= 0) {
				subs.splice(index, 1);
			}
		} else {
			// Remove all subscriptions for daemon
			this.subscriptions.delete(daemonId);
		}
	}

	/** Get event history */
	getHistory(limit = 50): MeshEvent[] {
		return this.events.slice(-limit);
	}

	/** Get events matching pattern since timestamp */
	getEventsSince(pattern: string, since: string): MeshEvent[] {
		const sinceTime = new Date(since).getTime();
		return this.events.filter(e => 
			new Date(e.timestamp).getTime() > sinceTime &&
			this.matchesPattern(e.type, pattern)
		);
	}

	/** Route event to matching subscribers */
	private routeEvent(event: MeshEvent) {
		const targets = new Set<string>();

		// Find matching subscribers
		for (const [daemonId, subs] of this.subscriptions) {
			for (const sub of subs) {
				if (this.matchesPattern(event.type, sub.pattern) &&
					this.matchesScope(event, daemonId)) {
					targets.add(daemonId);
				}
			}
		}

		// Send event to each target
		for (const daemonId of targets) {
			this.router.sendTo(daemonId, {
				id: makeId(),
				from: 'master',
				to: daemonId,
				type: 'event_notification',
				payload: event,
				timestamp: new Date().toISOString()
			});
		}

		if (targets.size > 0) {
			console.log(`[event-bus] → Routed ${event.type} to ${targets.size} subscriber(s)`);
		}
	}

	/** Check if event type matches pattern (glob-style) */
	private matchesPattern(eventType: string, pattern: string): boolean {
		// Convert glob pattern to regex
		const regexPattern = pattern
			.replace(/\*/g, '.*')
			.replace(/\?/g, '.');
		return new RegExp(`^${regexPattern}$`).test(eventType);
	}

	/** Check if event scope matches daemon */
	private matchesScope(event: MeshEvent, daemonId: string): boolean {
		if (!event.scope) return true; // No scope = broadcast to all

		if (event.scope === 'broadcast') return true;
		
		// Get daemon type for scope matching
		const daemon = this.registry.get(daemonId);
		if (!daemon) return false;

		return event.scope === daemon.type;
	}

	/** Get subscription stats */
	getStats() {
		const totalSubs = Array.from(this.subscriptions.values())
			.reduce((sum, subs) => sum + subs.length, 0);
		
		return {
			totalEvents: this.events.length,
			totalSubscriptions: totalSubs,
			subscribers: this.subscriptions.size,
			recentEvents: this.events.slice(-5).map(e => `${e.type} from ${e.source}`)
		};
	}
}