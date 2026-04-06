/**
 * Task Board — Kanban-style task tracking for the P10 mesh.
 * 
 * Tracks tasks across columns: planned → in-progress → done / failed / blocked.
 * Fed automatically from MessageTracker flow + manual additions.
 * Emits board events via the EventBus for real-time UI updates.
 */

import { makeId } from './types.js';
import type { MeshEventBus } from './eventBus.js';

export type TaskColumn = 'planned' | 'in-progress' | 'done' | 'failed' | 'blocked';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface BoardTask {
	id: string;
	title: string;
	instruction: string;
	column: TaskColumn;
	assignedTo?: string;
	origin: {
		channel: string;
		userId?: string;
		userName?: string;
	};
	priority: TaskPriority;
	parentId?: string;
	tags?: string[];
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
	};
}

const MAX_DONE_TASKS = 100;

export class TaskBoard {
	private tasks = new Map<string, BoardTask>();
	private eventBus: MeshEventBus | null = null;

	setEventBus(bus: MeshEventBus) {
		this.eventBus = bus;
	}

	/** Add a new task to the board */
	add(opts: {
		id?: string;
		title: string;
		instruction?: string;
		column?: TaskColumn;
		origin?: BoardTask['origin'];
		priority?: TaskPriority;
		parentId?: string;
		tags?: string[];
	}): BoardTask {
		const task: BoardTask = {
			id: opts.id || makeId(),
			title: opts.title,
			instruction: opts.instruction || opts.title,
			column: opts.column || 'planned',
			origin: opts.origin || { channel: 'system' },
			priority: opts.priority || 'normal',
			parentId: opts.parentId,
			tags: opts.tags,
			createdAt: new Date().toISOString(),
		};

		this.tasks.set(task.id, task);
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

		return task;
	}

	/** Update a task's properties */
	update(taskId: string, updates: Partial<Pick<BoardTask, 'title' | 'priority' | 'tags' | 'assignedTo'>>): BoardTask | null {
		const task = this.tasks.get(taskId);
		if (!task) return null;

		Object.assign(task, updates);
		this.emitChange('board.task.updated', task);
		return task;
	}

	/** Remove a task from the board */
	remove(taskId: string): boolean {
		const task = this.tasks.get(taskId);
		if (!task) return false;

		this.tasks.delete(taskId);
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

		for (const task of this.tasks.values()) {
			byColumn[task.column]++;
			byPriority[task.priority]++;
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
			},
		};

		return snapshot;
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
