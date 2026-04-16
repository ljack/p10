/**
 * ProjectData — per-project board, pipelines, and events
 * Each project gets isolated state stored in ~/.p10/projects/{id}/
 * Lazy-loaded and cached by ProjectDataManager.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { makeId } from './types.js';
import { PROJECTS_DIR } from './projectStore.js';
import type { TaskPipeline, PipelineTask } from './decomposer.js';

// ─── Board Types ─────────────────────────────────────────────

export type TaskColumn = 'planned' | 'in-progress' | 'done' | 'failed' | 'blocked';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskScope = 'project' | 'platform';

export interface BoardTask {
	id: string;
	title: string;
	instruction: string;
	description?: string;
	column: TaskColumn;
	priority: TaskPriority;
	scope?: TaskScope;
	tags?: string[];
	pipelineId?: string;
	subtasks?: { role: string; instruction: string; status: string }[];
	createdAt: string;
	completedAt?: string;
	result?: string;
}

export interface BoardSnapshot {
	planned: BoardTask[];
	'in-progress': BoardTask[];
	done: BoardTask[];
	failed: BoardTask[];
	blocked: BoardTask[];
	stats: { total: number; byColumn: Record<string, number> };
}

// ─── Project Data Class ─────────────────────────────────────

export class ProjectData {
	readonly projectId: string;
	private dir: string;
	private tasks = new Map<string, BoardTask>();
	private pipelines = new Map<string, TaskPipeline>();
	private chat: any[] = [];

	constructor(projectId: string) {
		this.projectId = projectId;
		this.dir = join(PROJECTS_DIR, projectId);
		if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
		this.loadBoard();
		this.loadPipelines();
		this.loadChat();
	}

	// ─── Board ─────────────────────────────────

	addTask(opts: {
		title: string;
		instruction?: string;
		description?: string;
		priority?: TaskPriority;
		scope?: TaskScope;
		tags?: string[];
		pipelineId?: string;
	}): BoardTask {
		const task: BoardTask = {
			id: makeId(),
			title: opts.title,
			instruction: opts.instruction || opts.title,
			description: opts.description,
			column: 'planned',
			priority: opts.priority || 'normal',
			scope: opts.scope || 'project',
			tags: opts.tags,
			pipelineId: opts.pipelineId,
			createdAt: new Date().toISOString(),
		};
		this.tasks.set(task.id, task);
		this.persistBoard();
		return task;
	}

	moveTask(taskId: string, column: TaskColumn): BoardTask | null {
		const task = this.tasks.get(taskId);
		if (!task) return null;
		task.column = column;
		if (column === 'done' || column === 'failed') {
			task.completedAt = new Date().toISOString();
		}
		this.persistBoard();
		return task;
	}

	updateTask(taskId: string, updates: Partial<BoardTask>): BoardTask | null {
		const task = this.tasks.get(taskId);
		if (!task) return null;
		Object.assign(task, updates);
		this.persistBoard();
		return task;
	}

	deleteTask(taskId: string): boolean {
		const deleted = this.tasks.delete(taskId);
		if (deleted) this.persistBoard();
		return deleted;
	}

	getTask(taskId: string): BoardTask | null {
		return this.tasks.get(taskId) || null;
	}

	getBoard(): BoardSnapshot {
		const columns: Record<TaskColumn, BoardTask[]> = {
			planned: [], 'in-progress': [], done: [], failed: [], blocked: [],
		};
		const byColumn: Record<string, number> = {};

		for (const task of this.tasks.values()) {
			columns[task.column]?.push(task);
			byColumn[task.column] = (byColumn[task.column] || 0) + 1;
		}

		return {
			...columns,
			stats: { total: this.tasks.size, byColumn },
		};
	}

	clearProjectTasks(): number {
		let cleared = 0;
		for (const [id, task] of this.tasks) {
			if (task.scope !== 'platform') {
				this.tasks.delete(id);
				cleared++;
			}
		}
		if (cleared > 0) this.persistBoard();
		return cleared;
	}

	// ─── Pipelines ─────────────────────────────

	storePipeline(pipeline: TaskPipeline): void {
		this.pipelines.set(pipeline.id, pipeline);
		this.persistPipelines();
	}

	getPipeline(id: string): TaskPipeline | undefined {
		return this.pipelines.get(id);
	}

	updatePipeline(id: string, updates: Partial<TaskPipeline>): boolean {
		const pipeline = this.pipelines.get(id);
		if (!pipeline) return false;
		Object.assign(pipeline, updates);
		this.persistPipelines();
		return true;
	}

	getActivePipelines(): TaskPipeline[] {
		return Array.from(this.pipelines.values())
			.filter(p => p.status === 'executing' || p.status === 'planning');
	}

	getRecentPipelines(limit = 20): TaskPipeline[] {
		return Array.from(this.pipelines.values())
			.filter(p => p.status === 'completed' || p.status === 'failed')
			.sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt))
			.slice(0, limit);
	}

	getAllPipelines(): TaskPipeline[] {
		return Array.from(this.pipelines.values());
	}

	clearPipelines(): number {
		const count = this.pipelines.size;
		this.pipelines.clear();
		this.persistPipelines();
		return count;
	}

	// ─── Chat ──────────────────────────────────

	getChat(): any[] {
		return this.chat;
	}

	saveChat(messages: any[]): void {
		// Only store last 100 messages to prevent infinite growth
		this.chat = messages.slice(-100);
		this.persistChat();
	}

	clearChat(): void {
		this.chat = [];
		this.persistChat();
	}

	// ─── Container Snapshot ────────────────────

	get snapshotDir(): string {
		const dir = join(this.dir, 'container-snapshot');
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		return dir;
	}

	get specsDir(): string {
		const dir = join(this.dir, 'specs');
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		return dir;
	}

	saveContainerSnapshot(files: Record<string, string>): void {
		const dir = this.snapshotDir;
		for (const [path, content] of Object.entries(files)) {
			const fullPath = join(dir, path);
			const fileDir = join(fullPath, '..');
			if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });
			writeFileSync(fullPath, content);
		}
		console.log(`[project:${this.projectId}] Saved container snapshot (${Object.keys(files).length} files)`);
	}

	clearContainerSnapshot(): void {
		try {
			const dir = this.snapshotDir;
			if (existsSync(dir)) {
				// Delete all files and subdirectories
				const entries = readdirSync(dir);
				for (const entry of entries) {
					const fullPath = join(dir, entry);
					if (existsSync(fullPath)) {
						try {
							require('fs').rmSync(fullPath, { recursive: true, force: true });
						} catch { /* Node 14+ */
							try {
								const fs = require('fs');
								fs.rmdirSync(fullPath, { recursive: true });
							} catch { /* ignore */ }
						}
					}
				}
				console.log(`[project:${this.projectId}] Cleared container snapshot`);
			}
		} catch (err) {
			console.error(`[project:${this.projectId}] Failed to clear snapshot:`, err);
		}
	}

	loadContainerSnapshot(): Record<string, string> | null {
		const dir = this.snapshotDir;
		if (!existsSync(dir)) return null;
		const files: Record<string, string> = {};
		readDirRecursive(dir, '', files);
		if (Object.keys(files).length === 0) return null;
		console.log(`[project:${this.projectId}] Loaded container snapshot (${Object.keys(files).length} files)`);
		return files;
	}

	// ─── Persistence ───────────────────────────

	private loadBoard() {
		const file = join(this.dir, 'board.json');
		if (!existsSync(file)) return;
		try {
			const data = JSON.parse(readFileSync(file, 'utf-8'));
			for (const task of data.tasks || []) {
				this.tasks.set(task.id, task);
			}
		} catch (err) {
			console.error(`[project:${this.projectId}] Failed to load board:`, err);
		}
	}

	private persistBoard() {
		try {
			writeFileSync(
				join(this.dir, 'board.json'),
				JSON.stringify({ tasks: Array.from(this.tasks.values()) }, null, 2)
			);
		} catch (err) {
			console.error(`[project:${this.projectId}] Failed to persist board:`, err);
		}
	}

	private loadPipelines() {
		const file = join(this.dir, 'pipelines.json');
		if (!existsSync(file)) return;
		try {
			const data = JSON.parse(readFileSync(file, 'utf-8'));
			for (const pipeline of data.pipelines || []) {
				this.pipelines.set(pipeline.id, pipeline);
			}
		} catch (err) {
			console.error(`[project:${this.projectId}] Failed to load pipelines:`, err);
		}
	}

	private persistPipelines() {
		try {
			writeFileSync(
				join(this.dir, 'pipelines.json'),
				JSON.stringify({ pipelines: Array.from(this.pipelines.values()) }, null, 2)
			);
		} catch (err) {
			console.error(`[project:${this.projectId}] Failed to persist pipelines:`, err);
		}
	}

	private loadChat() {
		const file = join(this.dir, 'chat.json');
		if (!existsSync(file)) return;
		try {
			const data = JSON.parse(readFileSync(file, 'utf-8'));
			this.chat = data.messages || [];
		} catch (err) {
			console.error(`[project:${this.projectId}] Failed to load chat:`, err);
		}
	}

	private persistChat() {
		try {
			writeFileSync(
				join(this.dir, 'chat.json'),
				JSON.stringify({ messages: this.chat }, null, 2)
			);
		} catch (err) {
			console.error(`[project:${this.projectId}] Failed to persist chat:`, err);
		}
	}
}

// ─── Manager (caches ProjectData instances) ─────────────────

class ProjectDataManager {
	private cache = new Map<string, ProjectData>();

	get(projectId: string): ProjectData {
		let data = this.cache.get(projectId);
		if (!data) {
			data = new ProjectData(projectId);
			this.cache.set(projectId, data);
		}
		return data;
	}

	evict(projectId: string): void {
		this.cache.delete(projectId);
	}
}

export const projectDataManager = new ProjectDataManager();

// ─── Helpers ─────────────────────────────────────────────────

function readDirRecursive(baseDir: string, prefix: string, files: Record<string, string>) {
	try {
		const dir = prefix ? join(baseDir, prefix) : baseDir;
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const path = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name === '.git') continue;
				readDirRecursive(baseDir, path, files);
			} else {
				try {
					files[path] = readFileSync(join(baseDir, path), 'utf-8');
				} catch { /* skip binary files */ }
			}
		}
	} catch { /* dir doesn't exist */ }
}
