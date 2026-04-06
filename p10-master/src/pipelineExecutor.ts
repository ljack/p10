/**
 * Pipeline Executor — Executes task pipelines sequentially,
 * routing role-based tasks to available Pi Daemons.
 *
 * Supports:
 * - Sequential task execution with dependency resolution
 * - Role-based routing to Pi Daemon session pool
 * - Structured handoffs: prior task results passed as context
 * - Progress broadcasting to all mesh participants
 * - Error recovery via review_agent
 * - Multi-daemon support (picks any alive pi daemon)
 */

import type { DaemonRegistry } from './registry.js';
import type { MessageRouter } from './router.js';
import type { MeshEventBus } from './eventBus.js';
import type { TaskPipeline, PipelineTask } from './decomposer.js';
import { pipelineStorage } from './pipelineStorage.js';
import { makeId } from './types.js';

const TASK_TIMEOUT = 120_000; // 2 minutes per task
const SIDE_EFFECT_WAIT: Record<string, number> = {
	api_agent: 5000,       // Backend restart via --watch
	web_agent: 2000,       // Vite hot-reload
	review_agent: 1000,    // No side effects
	planning_agent: 500,   // No side effects
};

export class PipelineExecutor {
	private registry: DaemonRegistry;
	private router: MessageRouter;
	private eventBus: MeshEventBus;

	// Track pending task responses: taskId → resolve/reject
	private pendingTasks = new Map<string, {
		resolve: (result: any) => void;
		reject: (error: Error) => void;
		timer: ReturnType<typeof setTimeout>;
	}>();

	constructor(registry: DaemonRegistry, router: MessageRouter, eventBus: MeshEventBus) {
		this.registry = registry;
		this.router = router;
		this.eventBus = eventBus;
	}

	/**
	 * Handle task_result messages routed back from Pi Daemons.
	 * Must be called from the master's message handler.
	 */
	handleTaskResult(taskId: string, result: any) {
		const pending = this.pendingTasks.get(taskId);
		if (pending) {
			clearTimeout(pending.timer);
			this.pendingTasks.delete(taskId);
			pending.resolve(result);
		}
	}

	/**
	 * Execute a full pipeline from start to finish.
	 * Returns when all tasks are done (or pipeline fails).
	 */
	async execute(pipeline: TaskPipeline): Promise<TaskPipeline> {
		pipeline.status = 'executing';
		pipelineStorage.store(pipeline);

		console.log(`[executor] ▶ Pipeline "${pipeline.instruction}" — ${pipeline.tasks.length} tasks`);
		this.broadcastProgress(pipeline);
		this.eventBus.emit('pipeline.started', 'master', {
			pipelineId: pipeline.id,
			instruction: pipeline.instruction,
			taskCount: pipeline.tasks.length,
		});

		// Collect results from completed tasks for structured handoffs
		const taskResults: Array<{ role: string; instruction: string; result: string }> = [];

		for (let i = 0; i < pipeline.tasks.length; i++) {
			const task = pipeline.tasks[i];
			pipeline.currentTaskIndex = i;

			// Check dependencies
			if (!this.dependenciesMet(task, pipeline)) {
				task.status = 'skipped';
				console.log(`[executor] ⏭ Skipped: ${task.instruction.slice(0, 60)} (deps not met)`);
				continue;
			}

			// Find an alive Pi Daemon
			const piDaemon = this.findPiDaemon();
			if (!piDaemon) {
				task.status = 'failed';
				task.result = 'No Pi Daemon available';
				pipeline.status = 'failed';
				console.log(`[executor] ❌ No Pi Daemon connected — pipeline aborted`);
				break;
			}

			// Execute the task
			task.status = 'active';
			this.broadcastProgress(pipeline);
			console.log(`[executor] 🔄 [${task.role}] ${task.instruction.slice(0, 80)}`);

			const result = await this.executeTask(task, piDaemon.id, taskResults);

			if (result.error) {
				task.status = 'failed';
				task.result = result.error;
				console.log(`[executor] ❌ [${task.role}] Failed: ${result.error}`);

				// Attempt recovery via review_agent (unless this IS the review agent)
				if (task.role !== 'review_agent') {
					const recovered = await this.attemptRecovery(task, result.error, pipeline, piDaemon.id, taskResults);
					if (recovered) {
						task.status = 'completed';
						task.result = `Recovered: ${recovered.result?.slice(0, 200)}`;
						taskResults.push({
							role: task.role,
							instruction: task.instruction,
							result: task.result,
						});
						continue;
					}
				}

				// Unrecoverable failure — abort pipeline
				pipeline.status = 'failed';
				console.log(`[executor] ❌ Pipeline failed at task ${i + 1}/${pipeline.tasks.length}`);
				break;
			} else {
				task.status = 'completed';
				task.result = result.result?.slice(0, 500) || 'Done';
				taskResults.push({
					role: task.role,
					instruction: task.instruction,
					result: task.result || 'Done',
				});
				console.log(`[executor] ✅ [${task.role}] Completed`);
			}

			// Wait for side effects (backend restart, hot-reload)
			const waitMs = SIDE_EFFECT_WAIT[task.role] || 1000;
			await sleep(waitMs);

			this.broadcastProgress(pipeline);
		}

		// Finalize
		if (pipeline.status !== 'failed') {
			pipeline.status = 'completed';
		}
		pipeline.completedAt = new Date().toISOString();
		pipelineStorage.store(pipeline);

		this.broadcastProgress(pipeline);
		this.eventBus.emit('pipeline.completed', 'master', {
			pipelineId: pipeline.id,
			status: pipeline.status,
			completedTasks: pipeline.tasks.filter(t => t.status === 'completed').length,
			totalTasks: pipeline.tasks.length,
		});

		const completed = pipeline.tasks.filter(t => t.status === 'completed').length;
		console.log(`[executor] ${pipeline.status === 'completed' ? '✅' : '❌'} Pipeline done: ${completed}/${pipeline.tasks.length} tasks`);

		return pipeline;
	}

	/**
	 * Send a task_with_role to a specific Pi Daemon and wait for the result.
	 */
	private executeTask(
		task: PipelineTask,
		targetDaemonId: string,
		priorResults: Array<{ role: string; instruction: string; result: string }>
	): Promise<any> {
		return new Promise((resolve) => {
			const taskId = task.id;

			// Build pipeline context from prior task results
			const pipelineContext = priorResults.length > 0
				? priorResults.map(r => `[${r.role}] ${r.instruction}\n→ ${r.result}`).join('\n\n')
				: '';

			// Set up response listener with timeout
			const timer = setTimeout(() => {
				this.pendingTasks.delete(taskId);
				resolve({ error: `Task timed out after ${TASK_TIMEOUT / 1000}s` });
			}, TASK_TIMEOUT);

			this.pendingTasks.set(taskId, { resolve, reject: () => {}, timer });

			// Send task_with_role to the Pi Daemon
			this.router.sendTo(targetDaemonId, {
				id: makeId(),
				from: 'master',
				to: targetDaemonId,
				type: 'task_with_role',
				payload: {
					taskId,
					instruction: task.instruction,
					role: task.role,
					context: task.context,
					pipelineContext,
					priority: 'high',
				},
				timestamp: new Date().toISOString(),
			});
		});
	}

	/**
	 * Attempt to recover a failed task using the review_agent.
	 */
	private async attemptRecovery(
		failedTask: PipelineTask,
		error: string,
		pipeline: TaskPipeline,
		piDaemonId: string,
		priorResults: Array<{ role: string; instruction: string; result: string }>
	): Promise<any | null> {
		console.log(`[executor] 🔧 Attempting recovery for: ${failedTask.instruction.slice(0, 60)}`);

		const recoveryTask: PipelineTask = {
			id: makeId(),
			role: 'review_agent',
			instruction: `The previous task failed. Diagnose and fix the issue.\n\nFailed task (${failedTask.role}): "${failedTask.instruction}"\nError: ${error}\n\nPlease fix the underlying issue so the task can succeed.`,
			status: 'active',
		};

		const result = await this.executeTask(recoveryTask, piDaemonId, priorResults);

		if (result.error) {
			console.log(`[executor] 🔧 Recovery failed: ${result.error}`);
			return null;
		}

		console.log(`[executor] 🔧 Recovery succeeded`);
		return result;
	}

	/**
	 * Find an alive Pi Daemon to route tasks to.
	 * Supports multiple Pi Daemons — picks the first alive one.
	 * Future: load balancing, task affinity, etc.
	 */
	private findPiDaemon() {
		const piDaemons = this.registry.getByType('pi').filter(d => d.status === 'alive');
		if (piDaemons.length === 0) return null;

		// For now: pick the first alive one.
		// Future: pick the least busy, or one with matching role capabilities.
		return piDaemons[0];
	}

	/**
	 * Check if a task's dependencies are all completed.
	 */
	private dependenciesMet(task: PipelineTask, pipeline: TaskPipeline): boolean {
		if (!task.dependsOn || task.dependsOn.length === 0) return true;
		return task.dependsOn.every(depId => {
			const dep = pipeline.tasks.find(t => t.id === depId);
			return dep?.status === 'completed';
		});
	}

	/**
	 * Broadcast pipeline progress to all mesh participants.
	 */
	private broadcastProgress(pipeline: TaskPipeline) {
		this.router.broadcast({
			id: makeId(),
			from: 'master',
			to: '*',
			type: 'pipeline_progress',
			payload: {
				pipelineId: pipeline.id,
				instruction: pipeline.instruction,
				currentTaskIndex: pipeline.currentTaskIndex,
				totalTasks: pipeline.tasks.length,
				status: pipeline.status,
				tasks: pipeline.tasks.map(t => ({
					id: t.id,
					role: t.role,
					instruction: t.instruction.slice(0, 100),
					status: t.status,
				})),
			},
			timestamp: new Date().toISOString(),
		});
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
