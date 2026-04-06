/**
 * Auto-Scheduler — assigns planned board tasks to idle agents.
 *
 * When a pi daemon emits `agent.idle`, the scheduler checks the board
 * for tasks marked `autoPickup: true` and dispatches the highest-priority
 * one to the idle agent.
 *
 * Rules:
 * - Only tasks with `autoPickup === true` are eligible
 * - PLAN.md-synced tasks are never auto-eligible (human plans need human approval)
 * - Pipeline sub-tasks are handled by the pipeline executor, not here
 * - Cooldown: wait 5s after idle before picking next task (avoid thrashing)
 * - Max 1 task per idle event (no greedy grabbing)
 */

import type { TaskBoard, BoardTask } from './taskBoard.js';
import type { MessageRouter } from './router.js';
import type { DaemonRegistry } from './registry.js';
import type { MeshEventBus } from './eventBus.js';
import type { MessageTracker } from './messageTracker.js';
import { makeId } from './types.js';

const PICKUP_COOLDOWN_MS = 5_000;

export class AutoScheduler {
	private board: TaskBoard;
	private router: MessageRouter;
	private registry: DaemonRegistry;
	private eventBus: MeshEventBus;
	private tracker: MessageTracker;
	private pendingPickups = new Map<string, ReturnType<typeof setTimeout>>(); // agentId → timer
	private enabled = true;

	constructor(
		board: TaskBoard,
		router: MessageRouter,
		registry: DaemonRegistry,
		eventBus: MeshEventBus,
		tracker: MessageTracker,
	) {
		this.board = board;
		this.router = router;
		this.registry = registry;
		this.eventBus = eventBus;
		this.tracker = tracker;
	}

	/** Called when an agent.idle event is received */
	handleAgentIdle(agentId: string) {
		if (!this.enabled) return;

		// Cancel any pending pickup for this agent (e.g., if it went idle twice quickly)
		if (this.pendingPickups.has(agentId)) {
			clearTimeout(this.pendingPickups.get(agentId)!);
		}

		// Cooldown before picking up
		const timer = setTimeout(() => {
			this.pendingPickups.delete(agentId);
			this.tryPickup(agentId);
		}, PICKUP_COOLDOWN_MS);

		this.pendingPickups.set(agentId, timer);
	}

	/** Try to assign a task to the given agent */
	private tryPickup(agentId: string) {
		// Verify agent is still alive
		const daemon = this.registry.get(agentId);
		if (!daemon || daemon.status !== 'alive') {
			console.log(`[auto-scheduler] Agent ${agentId} no longer alive, skipping pickup`);
			return;
		}

		// Find the highest-priority auto-eligible planned task
		const task = this.findEligibleTask();
		if (!task) {
			return; // Nothing to do
		}

		// Claim it: move to in-progress
		this.board.move(task.id, 'in-progress', { assignedTo: agentId });

		// Track the task
		this.tracker.track(task.id, {
			channel: 'auto-scheduler',
			channelId: 'auto',
		}, task.instruction);

		// Dispatch to the agent
		this.router.sendTo(agentId, {
			id: makeId(),
			from: 'master',
			to: agentId,
			type: 'task',
			payload: {
				taskId: task.id,
				instruction: task.instruction,
				context: task.description || undefined,
				priority: task.priority,
			},
			timestamp: new Date().toISOString(),
		});

		this.eventBus.emit('auto.task.assigned', 'auto-scheduler', {
			agentId,
			taskId: task.id,
			title: task.title,
			priority: task.priority,
		});

		console.log(`[auto-scheduler] 🤖 Assigned "${task.title.slice(0, 60)}" to ${daemon.name} (${agentId})`);
	}

	/** Find the best auto-eligible planned task */
	private findEligibleTask(): BoardTask | null {
		const planned = this.board.getColumn('planned');

		// Filter to auto-pickup tasks, sorted by priority (getColumn already sorts)
		const eligible = planned.filter(t =>
			t.autoPickup === true &&
			t.origin.channel !== 'plan.md' // Never auto-pick PLAN.md tasks
		);

		return eligible.length > 0 ? eligible[0] : null;
	}

	/** Enable/disable auto-scheduling */
	setEnabled(enabled: boolean) {
		this.enabled = enabled;
		if (!enabled) {
			// Cancel all pending pickups
			for (const timer of this.pendingPickups.values()) {
				clearTimeout(timer);
			}
			this.pendingPickups.clear();
		}
		console.log(`[auto-scheduler] ${enabled ? 'Enabled' : 'Disabled'}`);
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	/** Stop and clean up */
	stop() {
		for (const timer of this.pendingPickups.values()) {
			clearTimeout(timer);
		}
		this.pendingPickups.clear();
	}
}
