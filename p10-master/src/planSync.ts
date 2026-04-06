/**
 * PLAN.md ↔ TaskBoard bidirectional sync.
 * 
 * - Parses `- [ ] task` / `- [x] task` lines from PLAN.md
 * - Creates board tasks for unchecked items
 * - Marks board tasks done when checkboxes are ticked
 * - Updates PLAN.md checkboxes when board tasks complete
 */

import { readFileSync, writeFileSync, existsSync, watchFile, unwatchFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TaskBoard, BoardTask } from './taskBoard.js';

interface PlanItem {
	line: number;
	title: string;
	done: boolean;
	phase: string;
}

// Project root is one level up from p10-master/
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = process.env.P10_PROJECT_DIR || join(__dirname, '..', '..');

export class PlanSync {
	private board: TaskBoard;
	private planPath: string;
	private syncing = false;
	private lastContent = '';
	private syncedIds = new Map<string, string>(); // title hash → board task ID

	constructor(board: TaskBoard, planPath?: string) {
		this.board = board;
		this.planPath = planPath || join(PROJECT_DIR, 'PLAN.md');
	}

	/** Parse PLAN.md and sync to board */
	sync() {
		if (this.syncing) return;
		this.syncing = true;

		try {
			if (!existsSync(this.planPath)) {
				this.syncing = false;
				return;
			}

			const content = readFileSync(this.planPath, 'utf-8');
			if (content === this.lastContent) {
				this.syncing = false;
				return;
			}
			this.lastContent = content;

			const items = this.parse(content);
			this.syncToBoard(items);

			console.log(`[plan-sync] Synced ${items.length} items from PLAN.md`);
		} catch (err: any) {
			console.error(`[plan-sync] Sync error: ${err.message}`);
		} finally {
			this.syncing = false;
		}
	}

	/** Parse PLAN.md into items */
	parse(content: string): PlanItem[] {
		const items: PlanItem[] = [];
		const lines = content.split('\n');
		let currentPhase = '';

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			const phaseMatch = line.match(/^##\s+(.+)/);
			if (phaseMatch) {
				currentPhase = phaseMatch[1].trim();
				continue;
			}

			const taskMatch = line.match(/^-\s+\[([ x])\]\s+(.+)/);
			if (taskMatch) {
				items.push({
					line: i,
					title: taskMatch[2].trim(),
					done: taskMatch[1] === 'x',
					phase: currentPhase,
				});
			}
		}

		return items;
	}

	/** Sync parsed items to the board */
	private syncToBoard(items: PlanItem[]) {
		for (const item of items) {
			const key = this.titleKey(item.title);
			const existingId = this.syncedIds.get(key);
			const existingTask = existingId ? this.board.get(existingId) : this.board.findByTitle(item.title);

			if (existingTask) {
				// Update existing task
				this.syncedIds.set(key, existingTask.id);

				if (item.done && existingTask.column !== 'done') {
					this.board.move(existingTask.id, 'done');
				} else if (!item.done && existingTask.column === 'done') {
					// Checkbox unchecked — move back to planned
					this.board.move(existingTask.id, 'planned');
				}
			} else if (!item.done) {
				// New unchecked item → add to board as planned
				const task = this.board.add({
					title: item.title,
					instruction: item.title,
					column: 'planned',
					origin: { channel: 'plan.md' },
					priority: 'normal',
					tags: item.phase ? [item.phase] : undefined,
				});
				this.syncedIds.set(key, task.id);
			}
		}
	}

	/** Update PLAN.md checkboxes from board state */
	updatePlanFile() {
		if (this.syncing) return;
		if (!existsSync(this.planPath)) return;

		this.syncing = true;
		try {
			let content = readFileSync(this.planPath, 'utf-8');
			let changed = false;

			for (const [key, taskId] of this.syncedIds) {
				const task = this.board.get(taskId);
				if (!task) continue;

				if (task.column === 'done') {
					// Check the checkbox
					const unchecked = new RegExp(`^(- \\[ \\] )${this.escapeRegex(task.title)}`, 'm');
					if (unchecked.test(content)) {
						content = content.replace(unchecked, `- [x] ${task.title}`);
						changed = true;
					}
				} else if (task.column === 'planned' || task.column === 'in-progress') {
					// Uncheck if it was checked
					const checked = new RegExp(`^(- \\[x\\] )${this.escapeRegex(task.title)}`, 'm');
					if (checked.test(content)) {
						content = content.replace(checked, `- [ ] ${task.title}`);
						changed = true;
					}
				}
			}

			if (changed) {
				this.lastContent = content;
				writeFileSync(this.planPath, content);
				console.log('[plan-sync] Updated PLAN.md checkboxes');
			}
		} catch (err: any) {
			console.error(`[plan-sync] Update error: ${err.message}`);
		} finally {
			this.syncing = false;
		}
	}

	/** Start watching PLAN.md for changes */
	watch() {
		if (!existsSync(this.planPath)) {
			console.log(`[plan-sync] No PLAN.md at ${this.planPath} — skipping watch`);
			return;
		}

		// Initial sync
		this.sync();

		// Watch for changes (poll every 3s — watchFile is more reliable than fs.watch)
		watchFile(this.planPath, { interval: 3000 }, () => {
			this.sync();
		});

		console.log(`[plan-sync] Watching ${this.planPath}`);
	}

	/** Stop watching */
	unwatch() {
		try { unwatchFile(this.planPath); } catch { /* ignore */ }
	}

	/** Get sync status */
	getStatus() {
		return {
			planPath: this.planPath,
			exists: existsSync(this.planPath),
			syncedTasks: this.syncedIds.size,
			mapping: Object.fromEntries(this.syncedIds),
		};
	}

	private titleKey(title: string): string {
		return title.toLowerCase().trim().replace(/\s+/g, ' ');
	}

	private escapeRegex(s: string): string {
		return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
