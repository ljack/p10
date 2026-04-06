/**
 * Autonomous Run Manager — Fire-and-forget development runs.
 * 
 * Reads PLAN.md tasks, decomposes each into a pipeline, executes sequentially,
 * updates PLAN.md checkboxes, and generates a morning report when done.
 * 
 * The core of P10's "Spec it by day, ship it by night" philosophy.
 */

import { decompose, type TaskPipeline } from './decomposer.js';
import { pipelineStorage } from './pipelineStorage.js';
import type { PipelineExecutor } from './pipelineExecutor.js';
import type { MeshEventBus } from './eventBus.js';
import { makeId } from './types.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const RUNS_DIR = join(process.cwd(), 'data');
const RUNS_FILE = join(RUNS_DIR, 'runs.json');

export interface PlanTask {
	title: string;
	checked: boolean;
	phase: string;       // e.g. "Phase 1: Foundation"
}

export interface RunTask {
	id: string;
	title: string;
	phase: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
	pipelineId?: string;
	result?: string;
	startedAt?: string;
	completedAt?: string;
}

export interface AutonomousRun {
	id: string;
	instruction: string;    // What the user asked to build
	planSource: string;     // 'plan.md' or 'instruction' 
	status: 'preparing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
	tasks: RunTask[];
	currentTaskIndex: number;
	startedAt: string;
	completedAt?: string;
	pausedAt?: string;
	report?: string;        // Generated morning report
	stats: {
		totalTasks: number;
		completed: number;
		failed: number;
		skipped: number;
		durationMs?: number;
	};
}

export class AutonomousRunManager {
	private runs = new Map<string, AutonomousRun>();
	private executor: PipelineExecutor | null = null;
	private eventBus: MeshEventBus | null = null;
	private pausedRuns = new Set<string>();
	private cancelledRuns = new Set<string>();

	constructor() {
		this.load();
	}

	setExecutor(executor: PipelineExecutor) {
		this.executor = executor;
	}

	setEventBus(bus: MeshEventBus) {
		this.eventBus = bus;
	}

	/**
	 * Start an autonomous run from PLAN.md content or a free-form instruction.
	 */
	async start(opts: {
		instruction: string;
		planContent?: string;   // Raw PLAN.md content
		planFile?: string;      // Path to PLAN.md file
	}): Promise<AutonomousRun> {
		const runId = makeId();
		let tasks: RunTask[] = [];
		let planSource = 'instruction';

		// If PLAN.md content is provided, parse tasks from it
		if (opts.planContent) {
			const planTasks = parsePlanMd(opts.planContent);
			tasks = planTasks
				.filter(t => !t.checked) // Only unchecked tasks
				.map(t => ({
					id: makeId(),
					title: t.title,
					phase: t.phase,
					status: 'pending' as const,
				}));
			planSource = 'plan.md';
		} else if (opts.planFile && existsSync(opts.planFile)) {
			const content = readFileSync(opts.planFile, 'utf-8');
			const planTasks = parsePlanMd(content);
			tasks = planTasks
				.filter(t => !t.checked)
				.map(t => ({
					id: makeId(),
					title: t.title,
					phase: t.phase,
					status: 'pending' as const,
				}));
			planSource = opts.planFile;
		}

		// If no PLAN.md tasks, treat the instruction as a single big task
		if (tasks.length === 0) {
			tasks = [{
				id: makeId(),
				title: opts.instruction,
				phase: 'Direct',
				status: 'pending',
			}];
			planSource = 'instruction';
		}

		const run: AutonomousRun = {
			id: runId,
			instruction: opts.instruction,
			planSource,
			status: 'preparing',
			tasks,
			currentTaskIndex: 0,
			startedAt: new Date().toISOString(),
			stats: {
				totalTasks: tasks.length,
				completed: 0,
				failed: 0,
				skipped: 0,
			},
		};

		this.runs.set(runId, run);
		this.save();

		console.log(`[run] ▶ Autonomous run "${opts.instruction.slice(0, 60)}" — ${tasks.length} tasks from ${planSource}`);
		this.eventBus?.emit('run.started', 'master', {
			runId, instruction: opts.instruction, taskCount: tasks.length,
		});

		// Execute asynchronously
		this.executeRun(run).catch((err: any) => {
			console.error(`[run] Run ${runId} crashed:`, err.message);
			run.status = 'failed';
			this.save();
		});

		return run;
	}

	/**
	 * Pause a running run. Current pipeline will finish, then the run pauses.
	 */
	pause(runId: string): { success: boolean; message: string } {
		const run = this.runs.get(runId);
		if (!run) return { success: false, message: 'Run not found' };
		if (run.status !== 'running') return { success: false, message: `Run is ${run.status}, not running` };

		this.pausedRuns.add(runId);
		console.log(`[run] ⏸ Pause requested for run ${runId}`);
		return { success: true, message: 'Pause requested — current task will finish, then run pauses' };
	}

	/**
	 * Resume a paused run from where it left off.
	 */
	async resume(runId: string): Promise<{ success: boolean; message: string }> {
		const run = this.runs.get(runId);
		if (!run) return { success: false, message: 'Run not found' };
		if (run.status !== 'paused') return { success: false, message: `Run is ${run.status}, not paused` };

		this.pausedRuns.delete(runId);
		run.status = 'running';
		run.pausedAt = undefined;
		this.save();

		console.log(`[run] ▶ Resuming run ${runId} from task ${run.currentTaskIndex + 1}`);
		this.eventBus?.emit('run.resumed', 'master', { runId });

		// Re-execute from current position
		this.executeRun(run).catch((err: any) => {
			console.error(`[run] Run ${runId} crashed on resume:`, err.message);
			run.status = 'failed';
			this.save();
		});

		return { success: true, message: `Resumed from task ${run.currentTaskIndex + 1}/${run.tasks.length}` };
	}

	/**
	 * Cancel a running or paused run.
	 */
	cancel(runId: string): { success: boolean; message: string } {
		const run = this.runs.get(runId);
		if (!run) return { success: false, message: 'Run not found' };
		if (run.status !== 'running' && run.status !== 'paused') {
			return { success: false, message: `Run is ${run.status}` };
		}

		this.cancelledRuns.add(runId);
		this.pausedRuns.delete(runId);

		// If paused, finalize immediately
		if (run.status === 'paused') {
			this.finalizeRun(run, 'cancelled');
		}

		console.log(`[run] ⛔ Cancel requested for run ${runId}`);
		return { success: true, message: 'Cancel requested' };
	}

	get(runId: string): AutonomousRun | undefined {
		return this.runs.get(runId);
	}

	getActive(): AutonomousRun[] {
		return Array.from(this.runs.values())
			.filter(r => r.status === 'running' || r.status === 'paused' || r.status === 'preparing');
	}

	getRecent(limit = 10): AutonomousRun[] {
		return Array.from(this.runs.values())
			.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
			.slice(0, limit);
	}

	// --- Execution ---

	private async executeRun(run: AutonomousRun) {
		if (!this.executor) {
			run.status = 'failed';
			this.save();
			throw new Error('Pipeline executor not set');
		}

		run.status = 'running';
		this.save();

		for (let i = run.currentTaskIndex; i < run.tasks.length; i++) {
			const task = run.tasks[i];
			run.currentTaskIndex = i;

			// Skip already-completed tasks (from resume)
			if (task.status === 'completed') continue;

			// Check for cancel
			if (this.cancelledRuns.has(run.id)) {
				this.cancelledRuns.delete(run.id);
				for (let j = i; j < run.tasks.length; j++) {
					if (run.tasks[j].status === 'pending') run.tasks[j].status = 'skipped';
				}
				this.finalizeRun(run, 'cancelled');
				return;
			}

			// Check for pause
			if (this.pausedRuns.has(run.id)) {
				run.status = 'paused';
				run.pausedAt = new Date().toISOString();
				this.save();
				console.log(`[run] ⏸ Run paused at task ${i + 1}/${run.tasks.length}`);
				this.eventBus?.emit('run.paused', 'master', {
					runId: run.id, pausedAtTask: i,
				});
				return; // Exit — resume() will restart the loop
			}

			// Execute this task via pipeline
			task.status = 'running';
			task.startedAt = new Date().toISOString();
			this.save();
			this.broadcastRunProgress(run);

			console.log(`[run] 🔄 [${i + 1}/${run.tasks.length}] ${task.title}`);

			try {
				// Decompose the task into a pipeline
				const pipeline = await decompose(task.title);
				pipelineStorage.store(pipeline);
				task.pipelineId = pipeline.id;

				// Execute the pipeline (this blocks until done)
				const result = await this.executor.execute(pipeline);

				if (result.status === 'completed') {
					task.status = 'completed';
					task.completedAt = new Date().toISOString();
					task.result = `Pipeline completed: ${result.tasks.filter(t => t.status === 'completed').length}/${result.tasks.length} tasks`;
					run.stats.completed++;
					console.log(`[run] ✅ [${i + 1}/${run.tasks.length}] ${task.title}`);
				} else {
					task.status = 'failed';
					task.completedAt = new Date().toISOString();
					task.result = `Pipeline ${result.status}: ${result.tasks.find(t => t.status === 'failed')?.result?.slice(0, 200) || 'unknown error'}`;
					run.stats.failed++;
					console.log(`[run] ❌ [${i + 1}/${run.tasks.length}] ${task.title} — ${task.result.slice(0, 80)}`);

					// Continue to next task (don't abort the whole run on one failure)
				}
			} catch (err: any) {
				task.status = 'failed';
				task.completedAt = new Date().toISOString();
				task.result = `Error: ${err.message}`;
				run.stats.failed++;
				console.log(`[run] ❌ [${i + 1}/${run.tasks.length}] ${task.title} — ${err.message}`);
			}

			this.save();
			this.broadcastRunProgress(run);

			// Brief pause between pipelines for side effects
			await sleep(3000);
		}

		this.finalizeRun(run, 'completed');
	}

	private finalizeRun(run: AutonomousRun, status: 'completed' | 'failed' | 'cancelled') {
		run.status = status;
		run.completedAt = new Date().toISOString();
		run.stats.skipped = run.tasks.filter(t => t.status === 'skipped').length;
		run.stats.durationMs = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();

		// Generate morning report
		run.report = this.generateReport(run);

		this.save();
		this.broadcastRunProgress(run);

		console.log(`[run] ${status === 'completed' ? '✅' : status === 'cancelled' ? '⛔' : '❌'} Run ${status}: ${run.stats.completed}/${run.stats.totalTasks} tasks in ${formatDuration(run.stats.durationMs)}`);
		console.log(`[run] Report:\n${run.report}`);

		this.eventBus?.emit('run.completed', 'master', {
			runId: run.id,
			status,
			report: run.report,
			stats: run.stats,
		});
	}

	private generateReport(run: AutonomousRun): string {
		const lines: string[] = [];
		const duration = formatDuration(run.stats.durationMs || 0);

		lines.push(`# 🌅 Morning Report — ${new Date().toLocaleDateString()}`);
		lines.push('');
		lines.push(`**Run:** "${run.instruction}"`);
		lines.push(`**Status:** ${run.status}`);
		lines.push(`**Duration:** ${duration}`);
		lines.push(`**Tasks:** ${run.stats.completed} completed, ${run.stats.failed} failed, ${run.stats.skipped} skipped / ${run.stats.totalTasks} total`);
		lines.push('');

		// Completed tasks
		const completed = run.tasks.filter(t => t.status === 'completed');
		if (completed.length > 0) {
			lines.push('## ✅ Completed');
			for (const t of completed) {
				lines.push(`- ${t.title}`);
				if (t.result) lines.push(`  → ${t.result.slice(0, 150)}`);
			}
			lines.push('');
		}

		// Failed tasks
		const failed = run.tasks.filter(t => t.status === 'failed');
		if (failed.length > 0) {
			lines.push('## ❌ Failed (needs attention)');
			for (const t of failed) {
				lines.push(`- ${t.title}`);
				if (t.result) lines.push(`  → ${t.result.slice(0, 200)}`);
			}
			lines.push('');
		}

		// Skipped tasks
		const skipped = run.tasks.filter(t => t.status === 'skipped');
		if (skipped.length > 0) {
			lines.push('## ⏭ Skipped');
			for (const t of skipped) {
				lines.push(`- ${t.title}`);
			}
			lines.push('');
		}

		// Pending tasks (if paused)
		const pending = run.tasks.filter(t => t.status === 'pending');
		if (pending.length > 0) {
			lines.push('## ○ Remaining');
			for (const t of pending) {
				lines.push(`- ${t.title}`);
			}
			lines.push('');
		}

		lines.push('---');
		lines.push(`*Generated by P10 Autonomous Runner at ${new Date().toISOString()}*`);

		return lines.join('\n');
	}

	private broadcastRunProgress(run: AutonomousRun) {
		this.eventBus?.emit('run.progress', 'master', {
			runId: run.id,
			instruction: run.instruction,
			status: run.status,
			currentTaskIndex: run.currentTaskIndex,
			totalTasks: run.stats.totalTasks,
			completed: run.stats.completed,
			failed: run.stats.failed,
			tasks: run.tasks.map(t => ({
				title: t.title,
				status: t.status,
				pipelineId: t.pipelineId,
			})),
		});
	}

	// --- Persistence ---

	private load() {
		try {
			if (existsSync(RUNS_FILE)) {
				const data = JSON.parse(readFileSync(RUNS_FILE, 'utf-8'));
				for (const run of (data.runs || [])) {
					// Don't restore running runs — they can't resume automatically
					if (run.status === 'running') run.status = 'failed';
					this.runs.set(run.id, run);
				}
				console.log(`[run] Loaded ${this.runs.size} run(s) from disk`);
			}
		} catch (err: any) {
			console.warn(`[run] Failed to load runs.json: ${err.message}`);
		}
	}

	private save() {
		try {
			if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR, { recursive: true });
			writeFileSync(RUNS_FILE, JSON.stringify({
				runs: Array.from(this.runs.values()),
				savedAt: new Date().toISOString(),
			}, null, 2));
		} catch (err: any) {
			console.error(`[run] Failed to save runs.json: ${err.message}`);
		}
	}
}

// --- Helpers ---

export function parsePlanMd(content: string): PlanTask[] {
	const tasks: PlanTask[] = [];
	const lines = content.split('\n');
	let currentPhase = '';

	for (const line of lines) {
		const phaseMatch = line.match(/^## (.+)/);
		if (phaseMatch) {
			currentPhase = phaseMatch[1];
			continue;
		}

		const taskMatch = line.match(/^- \[([ x])\] (.+)/);
		if (taskMatch) {
			tasks.push({
				title: taskMatch[2].trim(),
				checked: taskMatch[1] === 'x',
				phase: currentPhase,
			});
		}
	}

	return tasks;
}

function formatDuration(ms: number): string {
	const s = Math.floor(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ${s % 60}s`;
	const h = Math.floor(m / 60);
	return `${h}h ${m % 60}m`;
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export const runManager = new AutonomousRunManager();
