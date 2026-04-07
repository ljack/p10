/**
 * Task Board — Kanban-style task tracking for the P10 mesh.
 * 
 * Tracks tasks across columns: planned → in-progress → done / failed / blocked.
 * Fed automatically from MessageTracker flow + manual additions.
 * Emits board events via the EventBus for real-time UI updates.
 */

import { makeId } from './types.js';
import type { MeshEventBus } from './eventBus.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.P10_DATA_DIR || join(__dirname, '..', 'data');
const BOARD_FILE = join(DATA_DIR, 'board.json');

export type TaskColumn = 'planned' | 'in-progress' | 'done' | 'failed' | 'blocked';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskScope = 'project' | 'platform';

export interface BoardSubtask {
	id: string;
	role: string;
	instruction: string;
	status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
	result?: string;
}

export interface TaskMeta {
	type: 'git_commit' | 'files_changed' | 'error' | 'url' | 'note';
	label: string;
	data: string;
	timestamp: string;
}

export interface TaskAnalysis {
	rewrittenTitle?: string;
	questions?: string[];
	ideas?: string[];
	dependencies?: string[];
	suggestedTags?: string[];
	summary?: string;
	analyzedAt: string;
}

export interface BoardTask {
	id: string;
	title: string;
	instruction: string;
	description?: string;
	column: TaskColumn;
	assignedTo?: string;
	origin: {
		channel: string;
		userId?: string;
		userName?: string;
	};
	priority: TaskPriority;
	scope?: TaskScope;
	parentId?: string;
	tags?: string[];
	humanCreated?: boolean;
	autoPickup?: boolean;
	pipelineId?: string;
	subtasks?: BoardSubtask[];
	meta?: TaskMeta[];
	analysis?: TaskAnalysis;
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
	result?: string;
}

export interface BoardSnapshot {
	planned: BoardTask[];
	'in-progress': BoardTask[];
	done: BoardTask[];
	failed: BoardTask[];
	blocked: BoardTask[];
	stats: {
		total: number;
		byColumn: Record<TaskColumn, number>;
		byPriority: Record<TaskPriority, number>;
		byScope: Record<TaskScope, number>;
	};
}

const MAX_DONE_TASKS = 100;

/** Auto-detect whether a task is about the P10 platform or the user's project */
function inferScope(title: string, tags?: string[], origin?: { channel: string }): TaskScope {
	const text = `${title} ${(tags || []).join(' ')}`.toLowerCase();

	// Platform indicators: P10 internals, mesh, daemon, board, pipeline infrastructure
	const platformPatterns = [
		/\bp10\b/, /\bmesh\b/, /\bdaemon\b/, /\bboard\b/, /\bkanban\b/,
		/\bpipeline\s*(executor|storage|improve)/, /\bgrooming\b/, /\banalyst\b/,
		/\bmemory\s*(tier|compress|archive)/, /\bplan\.md\b/, /\bplan\s*sync\b/,
		/\btelegram\s*(bot|bridge|integration)/, /\bbrowser\s*daemon\b/,
		/\bpi\s*(daemon|cli|sdk)\b/, /\bwebsocket\b/, /\bheartbeat\b/,
		/\bmvp[0-9]/, /\bsprint\b/, /\bmaster\s*daemon\b/,
		/\bevent\s*bus\b/, /\bregistry\b/, /\brouter\b/,
	];

	// Platform tags
	const platformTags = ['p10-infra', 'p10-pipeline', 'p10-testing', 'p10-devops', 'p10-docs', 'mvp4', 'mvp3'];

	if (platformPatterns.some(p => p.test(text))) return 'platform';
	if (tags?.some(t => platformTags.includes(t.toLowerCase()))) return 'platform';

	// PLAN.md in the p10 project root = platform tasks
	if (origin?.channel === 'plan.md') return 'platform';

	return 'project';
}

export class TaskBoard {
	private tasks = new Map<string, BoardTask>();
	private eventBus: MeshEventBus | null = null;

	constructor() {
		this.load();
	}

	setEventBus(bus: MeshEventBus) {
		this.eventBus = bus;
	}

	/** Load board state from disk */
	private load() {
		try {
			if (!existsSync(BOARD_FILE)) return;
			const data = JSON.parse(readFileSync(BOARD_FILE, 'utf-8'));
			if (Array.isArray(data.tasks)) {
				let backfilled = 0;
				for (const task of data.tasks) {
					// Backfill scope on tasks that predate the scope feature
					if (!task.scope) {
						task.scope = inferScope(task.title, task.tags, task.origin);
						backfilled++;
					}
					this.tasks.set(task.id, task);
				}
				console.log(`[board] Loaded ${this.tasks.size} tasks from ${BOARD_FILE}${backfilled ? ` (backfilled scope on ${backfilled})` : ''}`);
			}
		} catch (err: any) {
			console.warn(`[board] Failed to load board.json: ${err.message} — starting empty`);
		}
	}

	/** Save board state to disk */
	private save() {
		try {
			if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
			writeFileSync(BOARD_FILE, JSON.stringify({
				tasks: Array.from(this.tasks.values()),
				savedAt: new Date().toISOString(),
			}, null, 2));
		} catch (err: any) {
			console.error(`[board] Failed to save board.json: ${err.message}`);
		}
	}

	/** Add a new task to the board */
	add(opts: {
		id?: string;
		title: string;
		instruction?: string;
		description?: string;
		column?: TaskColumn;
		origin?: BoardTask['origin'];
		priority?: TaskPriority;
		parentId?: string;
		tags?: string[];
		humanCreated?: boolean;
		scope?: TaskScope;
		pipelineId?: string;
		subtasks?: BoardSubtask[];
	}): BoardTask {
		const task: BoardTask = {
			id: opts.id || makeId(),
			title: opts.title,
			instruction: opts.instruction || opts.title,
			description: opts.description,
			column: opts.column || 'planned',
			origin: opts.origin || { channel: 'system' },
			priority: opts.priority || 'normal',
			scope: opts.scope || inferScope(opts.title, opts.tags, opts.origin),
			parentId: opts.parentId,
			tags: opts.tags,
			humanCreated: opts.humanCreated,
			pipelineId: opts.pipelineId,
			subtasks: opts.subtasks,
			createdAt: new Date().toISOString(),
		};

		this.tasks.set(task.id, task);
		this.save();
		this.emitChange('board.task.added', task);
		console.log(`[board] + ${task.column}: "${task.title.slice(0, 60)}"`);
		return task;
	}

	/** Move a task to a different column */
	move(taskId: string, column: TaskColumn, extra?: { assignedTo?: string; result?: string }): BoardTask | null {
		const task = this.tasks.get(taskId);
		if (!task) return null;

		const from = task.column;
		task.column = column;

		if (column === 'in-progress' && !task.startedAt) {
			task.startedAt = new Date().toISOString();
		}
		if (column === 'done' || column === 'failed') {
			task.completedAt = new Date().toISOString();
		}
		if (extra?.assignedTo) task.assignedTo = extra.assignedTo;
		if (extra?.result) task.result = extra.result;

		this.emitChange('board.task.moved', task, { from, to: column });
		console.log(`[board] ${from} → ${column}: "${task.title.slice(0, 60)}"`);

		// Prune old done/failed tasks
		this.pruneCompleted();
		this.save();

		return task;
	}

	/** Update a task's properties */
	update(taskId: string, updates: Partial<Pick<BoardTask, 'title' | 'priority' | 'tags' | 'assignedTo'>>): BoardTask | null {
		const task = this.tasks.get(taskId);
		if (!task) return null;

		Object.assign(task, updates);
		this.save();
		this.emitChange('board.task.updated', task);
		return task;
	}

	/** Remove a task from the board */
	remove(taskId: string): boolean {
		const task = this.tasks.get(taskId);
		if (!task) return false;

		this.tasks.delete(taskId);
		this.save();
		this.emitChange('board.task.removed', task);
		return true;
	}

	/** Get a task by ID */
	get(taskId: string): BoardTask | undefined {
		return this.tasks.get(taskId);
	}

	/** Get all tasks in a column */
	getColumn(column: TaskColumn): BoardTask[] {
		return Array.from(this.tasks.values())
			.filter(t => t.column === column)
			.sort((a, b) => {
				// Priority sort: urgent > high > normal > low
				const prio = { urgent: 0, high: 1, normal: 2, low: 3 };
				return (prio[a.priority] - prio[b.priority]) || 
					   (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
			});
	}

	/** Get full board snapshot */
	getBoard(): BoardSnapshot {
		const columns: TaskColumn[] = ['planned', 'in-progress', 'done', 'failed', 'blocked'];
		const byColumn: Record<TaskColumn, number> = { planned: 0, 'in-progress': 0, done: 0, failed: 0, blocked: 0 };
		const byPriority: Record<TaskPriority, number> = { low: 0, normal: 0, high: 0, urgent: 0 };
		const byScope: Record<TaskScope, number> = { project: 0, platform: 0 };

		for (const task of this.tasks.values()) {
			byColumn[task.column]++;
			byPriority[task.priority]++;
			byScope[task.scope || 'project']++;
		}

		const snapshot: BoardSnapshot = {
			planned: this.getColumn('planned'),
			'in-progress': this.getColumn('in-progress'),
			done: this.getColumn('done'),
			failed: this.getColumn('failed'),
			blocked: this.getColumn('blocked'),
			stats: {
				total: this.tasks.size,
				byColumn,
				byPriority,
				byScope,
			},
		};

		return snapshot;
	}

	/** Get human-created tasks that haven't been analyzed yet */
	getUnanalyzed(maxAgeMs: number = Infinity): BoardTask[] {
		const now = Date.now();
		return Array.from(this.tasks.values()).filter(t =>
			t.humanCreated &&
			!t.analysis &&
			(now - new Date(t.createdAt).getTime()) >= 0 &&
			(maxAgeMs === Infinity || (now - new Date(t.createdAt).getTime()) <= maxAgeMs)
		);
	}

	/** Set analysis result on a task */
	setAnalysis(taskId: string, analysis: TaskAnalysis): BoardTask | null {
		const task = this.tasks.get(taskId);
		if (!task) return null;

		task.analysis = analysis;

		// Apply rewritten title if provided
		if (analysis.rewrittenTitle && analysis.rewrittenTitle !== task.title) {
			const original = task.title;
			task.title = analysis.rewrittenTitle;
			if (!task.description) task.description = original; // keep original as description
		}

		// Apply suggested tags
		if (analysis.suggestedTags?.length) {
			task.tags = [...new Set([...(task.tags || []), ...analysis.suggestedTags])];
		}

		this.save();
		this.emitChange('board.task.analyzed', task);
		console.log(`[board] 🔍 Analyzed: "${task.title.slice(0, 60)}"`);
		return task;
	}

	/** Update a subtask's status within a board task (for pipeline tracking) */
	updateSubtask(taskId: string, subtaskId: string, status: BoardSubtask['status'], result?: string): BoardTask | null {
		const task = this.tasks.get(taskId);
		if (!task || !task.subtasks) return null;

		const sub = task.subtasks.find(s => s.id === subtaskId);
		if (!sub) return null;

		sub.status = status;
		if (result) sub.result = result;

		this.save();
		this.emitChange('board.task.subtask_updated', task, { subtaskId, status });
		return task;
	}

	/** Attach metadata to a task (git commits, files changed, etc.) */
	addMeta(taskId: string, meta: TaskMeta): BoardTask | null {
		const task = this.tasks.get(taskId);
		if (!task) return null;

		if (!task.meta) task.meta = [];
		task.meta.push(meta);

		this.save();
		return task;
	}

	/** Find board task linked to a pipeline */
	findByPipelineId(pipelineId: string): BoardTask | undefined {
		return Array.from(this.tasks.values()).find(t => t.pipelineId === pipelineId);
	}

	/** Find task by title substring (for linking from PLAN.md etc.) */
	findByTitle(search: string): BoardTask | undefined {
		const lower = search.toLowerCase();
		return Array.from(this.tasks.values()).find(t => 
			t.title.toLowerCase().includes(lower)
		);
	}

	/** Get TLDR summary */
	getTldr(): string {
		const board = this.getBoard();
		const parts: string[] = [];

		if (board.stats.byColumn.planned > 0) parts.push(`${board.stats.byColumn.planned} planned`);
		if (board.stats.byColumn['in-progress'] > 0) parts.push(`${board.stats.byColumn['in-progress']} in progress`);
		if (board.stats.byColumn.done > 0) parts.push(`${board.stats.byColumn.done} done`);
		if (board.stats.byColumn.failed > 0) parts.push(`${board.stats.byColumn.failed} failed`);
		if (board.stats.byColumn.blocked > 0) parts.push(`${board.stats.byColumn.blocked} blocked`);

		return parts.length > 0 ? parts.join(', ') : 'empty board';
	}

	private emitChange(type: string, task: BoardTask, extra?: any) {
		this.eventBus?.emit(type, 'board', { task: { ...task }, ...extra });
	}

	private pruneCompleted() {
		const done = this.getColumn('done');
		const failed = this.getColumn('failed');
		const total = done.length + failed.length;

		if (total > MAX_DONE_TASKS) {
			// Remove oldest completed tasks
			const all = [...done, ...failed].sort((a, b) =>
				new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()
			);
			const toRemove = all.slice(0, total - MAX_DONE_TASKS);
			for (const task of toRemove) {
				this.tasks.delete(task.id);
			}
		}
	}
}

export const taskBoard = new TaskBoard();
