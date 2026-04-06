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
import { taskBoard } from './taskBoard.js';
import type { BoardSubtask } from './taskBoard.js';
import { makeId } from './types.js';

const TASK_TIMEOUT = 300_000; // 5 minutes per task
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

	// Pipelines that have been requested to cancel
	private cancelledPipelines = new Set<string>();

	constructor(registry: DaemonRegistry, router: MessageRouter, eventBus: MeshEventBus) {
		this.registry = registry;
		this.router = router;
		this.eventBus = eventBus;
	}

	/**
	 * Cancel a running pipeline. The current task will finish,
	 * but no further tasks will be started. Remaining tasks are marked 'skipped'.
	 */
	cancel(pipelineId: string): { success: boolean; message: string } {
		const pipeline = pipelineStorage.get(pipelineId);
		if (!pipeline) return { success: false, message: 'Pipeline not found' };
		if (pipeline.status !== 'executing') {
			return { success: false, message: `Pipeline is ${pipeline.status}, not executing` };
		}

		this.cancelledPipelines.add(pipelineId);
		console.log(`[executor] ⛔ Cancel requested for pipeline ${pipelineId}`);
		return { success: true, message: 'Cancel requested — current task will finish, remaining tasks will be skipped' };
	}

	/**
	 * Re-run a failed or completed pipeline from the first non-completed task.
	 * Completed tasks are kept; their results are used as prior context.
	 */
	async rerun(pipelineId: string): Promise<{ success: boolean; message: string; pipeline?: TaskPipeline }> {
		const pipeline = pipelineStorage.get(pipelineId);
		if (!pipeline) return { success: false, message: 'Pipeline not found' };
		if (pipeline.status === 'executing') {
			return { success: false, message: 'Pipeline is still executing' };
		}

		// Reset non-completed tasks to pending
		let firstRetryIndex = -1;
		for (let i = 0; i < pipeline.tasks.length; i++) {
			const task = pipeline.tasks[i];
			if (task.status !== 'completed') {
				if (firstRetryIndex === -1) firstRetryIndex = i;
				task.status = 'pending';
				task.result = undefined;
			}
		}

		if (firstRetryIndex === -1) {
			return { success: false, message: 'All tasks already completed — nothing to re-run' };
		}

		// Clear cancel flag if it was set
		this.cancelledPipelines.delete(pipelineId);

		pipeline.status = 'executing';
		pipeline.completedAt = undefined;
		pipeline.currentTaskIndex = firstRetryIndex;
		pipelineStorage.store(pipeline);

		console.log(`[executor] ↻ Re-running pipeline ${pipelineId} from task ${firstRetryIndex + 1}/${pipeline.tasks.length}`);

		// Execute asynchronously
		this.execute(pipeline).catch((err: any) => {
			console.error(`[executor] Re-run error:`, err.message);
		});

		return {
			success: true,
			message: `Re-running from task ${firstRetryIndex + 1}/${pipeline.tasks.length}`,
			pipeline,
		};
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

		// Create a board task for this pipeline with inline subtasks
		const boardSubtasks: BoardSubtask[] = pipeline.tasks.map(t => ({
			id: t.id,
			role: t.role,
			instruction: t.instruction,
			status: t.status === 'completed' ? 'completed' : 'pending',
		}));
		const boardTask = taskBoard.add({
			title: pipeline.instruction.slice(0, 120),
			instruction: pipeline.instruction,
			column: 'in-progress',
			origin: { channel: 'pipeline' },
			priority: 'high',
			pipelineId: pipeline.id,
			subtasks: boardSubtasks,
			tags: ['pipeline'],
		});
		const boardTaskId = boardTask.id;

		this.broadcastProgress(pipeline);
		this.eventBus.emit('pipeline.started', 'master', {
			pipelineId: pipeline.id,
			instruction: pipeline.instruction,
			taskCount: pipeline.tasks.length,
			boardTaskId,
		});

		// Collect results from completed tasks for structured handoffs
		const taskResults: Array<{ role: string; instruction: string; result: string }> = [];

		for (let i = 0; i < pipeline.tasks.length; i++) {
			const task = pipeline.tasks[i];
			pipeline.currentTaskIndex = i;

			// Skip already-completed tasks (from re-run)
			if (task.status === 'completed') {
				taskResults.push({
					role: task.role,
					instruction: task.instruction,
					result: task.result || 'Done',
				});
				continue;
			}

			// Check for cancellation between tasks
			if (this.cancelledPipelines.has(pipeline.id)) {
				this.cancelledPipelines.delete(pipeline.id);
				// Mark remaining tasks as skipped
				for (let j = i; j < pipeline.tasks.length; j++) {
					if (pipeline.tasks[j].status === 'pending') {
						pipeline.tasks[j].status = 'skipped';
					}
				}
				pipeline.status = 'failed';
				pipeline.completedAt = new Date().toISOString();
				console.log(`[executor] ⛔ Pipeline cancelled at task ${i + 1}/${pipeline.tasks.length}`);
				pipelineStorage.store(pipeline);
				this.broadcastProgress(pipeline);
				this.eventBus.emit('pipeline.cancelled', 'master', {
					pipelineId: pipeline.id,
					cancelledAtTask: i,
				});
				return pipeline;
			}

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
			taskBoard.updateSubtask(boardTaskId, task.id, 'active');
			this.broadcastProgress(pipeline);
			console.log(`[executor] 🔄 [${task.role}] ${task.instruction.slice(0, 80)}`);

			const result = await this.executeTask(task, piDaemon.id, taskResults);

			if (result.error) {
				task.status = 'failed';
				task.result = result.error;
				taskBoard.updateSubtask(boardTaskId, task.id, 'failed', result.error);
				console.log(`[executor] ❌ [${task.role}] Failed: ${result.error}`);

				// Attempt recovery via review_agent (unless this IS the review agent)
				if (task.role !== 'review_agent') {
					const recovered = await this.attemptRecovery(task, result.error, pipeline, piDaemon.id, taskResults);
					if (recovered) {
						task.status = 'completed';
						task.result = `Recovered: ${recovered.result?.slice(0, 200)}`;
						taskBoard.updateSubtask(boardTaskId, task.id, 'completed', task.result);
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
				taskBoard.updateSubtask(boardTaskId, task.id, 'completed', task.result?.slice(0, 200));
				taskBoard.addMeta(boardTaskId, {
					type: 'note',
					label: `${task.role} result`,
					data: task.result?.slice(0, 300) || 'Done',
					timestamp: new Date().toISOString(),
				});
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

		// Move board task to final column
		taskBoard.move(boardTaskId, pipeline.status === 'completed' ? 'done' : 'failed', {
			result: `${pipeline.tasks.filter(t => t.status === 'completed').length}/${pipeline.tasks.length} tasks completed`,
		});

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
