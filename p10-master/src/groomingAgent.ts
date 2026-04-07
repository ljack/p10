/**
 * Backlog Grooming Agent — manages board size and compresses knowledge.
 * 
 * Phases:
 * 1. Archive: move done/failed tasks from board to memory archive
 * 2. Consolidate: group archives by theme → memory nodes (AI-summarized)
 * 3. Reflect: distill memory groups → reflections (AI-generated insights)
 * 4. Prune: remove old raw data, keep summaries
 */

import type { TaskBoard, BoardTask } from './taskBoard.js';
import type { BoardMemory, MemoryNode } from './boardMemory.js';
import type { MessageRouter } from './router.js';
import type { DaemonRegistry } from './registry.js';
import type { MeshEventBus } from './eventBus.js';
import { makeId } from './types.js';

export interface GroomingConfig {
	/** How often to run grooming (ms). Default: 5 min */
	intervalMs: number;
	/** Move done tasks after this age (ms). Default: 30 min */
	archiveAfterMs: number;
	/** Max active board tasks before forced archiving. Default: 30 */
	maxBoardSize: number;
	/** Min archives in a group before consolidating. Default: 3 */
	consolidateMinGroup: number;
	/** Min memory nodes before reflecting. Default: 5 */
	reflectMinGroup: number;
	/** Prune archive raw data after (ms). Default: 7 days */
	pruneAfterMs: number;
}

const DEFAULT_CONFIG: GroomingConfig = {
	intervalMs: 5 * 60 * 1000,
	archiveAfterMs: 30 * 60 * 1000,
	maxBoardSize: 30,
	consolidateMinGroup: 3,
	reflectMinGroup: 5,
	pruneAfterMs: 7 * 24 * 60 * 60 * 1000,
};

export class GroomingAgent {
	private board: TaskBoard;
	private memory: BoardMemory;
	private router: MessageRouter;
	private registry: DaemonRegistry;
	private eventBus: MeshEventBus;
	private config: GroomingConfig;
	private timer: ReturnType<typeof setInterval> | null = null;
	private pendingConsolidations = new Map<string, string[]>(); // queryId → archiveIds
	private pendingReflections = new Map<string, string[]>(); // queryId → memoryIds
	private consolidationAttempts = new Map<string, number>(); // archiveGroupKey → attempt count
	private static MAX_CONSOLIDATION_ATTEMPTS = 3;

	constructor(
		board: TaskBoard,
		memory: BoardMemory,
		router: MessageRouter,
		registry: DaemonRegistry,
		eventBus: MeshEventBus,
		config?: Partial<GroomingConfig>,
	) {
		this.board = board;
		this.memory = memory;
		this.router = router;
		this.registry = registry;
		this.eventBus = eventBus;
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	start() {
		if (this.timer) return;
		this.timer = setInterval(() => this.groom(), this.config.intervalMs);
		console.log(`[grooming] Started (interval: ${Math.round(this.config.intervalMs / 1000)}s, archive after: ${Math.round(this.config.archiveAfterMs / 1000)}s)`);

		// Run first grooming after 30s to let things settle
		setTimeout(() => this.groom(), 30_000);
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	/** Handle AI responses for consolidation/reflection */
	handleTaskResult(taskId: string, result: any): boolean {
		const text = result?.result || '';
		const isError = !!result?.error;

		// Consolidation response
		const archiveIds = this.pendingConsolidations.get(taskId);
		if (archiveIds) {
			this.pendingConsolidations.delete(taskId);
			const groupKey = archiveIds.sort().join(',');

			if (isError) {
				// Track failed attempts
				const attempts = (this.consolidationAttempts.get(groupKey) || 0) + 1;
				this.consolidationAttempts.set(groupKey, attempts);
				if (attempts >= GroomingAgent.MAX_CONSOLIDATION_ATTEMPTS) {
					// Give up — consolidate with placeholder to stop retrying
					console.log(`[grooming] Consolidation failed ${attempts}x, giving up on group of ${archiveIds.length}`);
					this.memory.consolidate(archiveIds, 'Uncategorized work', `${archiveIds.length} tasks (consolidation failed)`);
					this.consolidationAttempts.delete(groupKey);
				}
				return true;
			}

			const parsed = this.parseSummary(text);
			if (parsed) {
				this.memory.consolidate(
					archiveIds,
					parsed.title,
					parsed.summary,
					parsed.themes,
				);
				this.consolidationAttempts.delete(groupKey);
				this.eventBus.emit('board.memory.consolidated', 'grooming', {
					archiveCount: archiveIds.length,
					title: parsed.title,
				});
			} else {
				// Couldn't parse — treat as failure
				const attempts = (this.consolidationAttempts.get(groupKey) || 0) + 1;
				this.consolidationAttempts.set(groupKey, attempts);
				if (attempts >= GroomingAgent.MAX_CONSOLIDATION_ATTEMPTS) {
					console.log(`[grooming] Consolidation unparseable ${attempts}x, giving up`);
					this.memory.consolidate(archiveIds, 'Uncategorized work', `${archiveIds.length} tasks (consolidation failed)`);
					this.consolidationAttempts.delete(groupKey);
				}
			}
			return true;
		}

		// Reflection response
		const memoryIds = this.pendingReflections.get(taskId);
		if (memoryIds) {
			this.pendingReflections.delete(taskId);
			const parsed = this.parseReflection(text);
			if (parsed) {
				this.memory.reflect(
					memoryIds,
					parsed.title,
					parsed.summary,
					parsed.learnings,
				);
				this.eventBus.emit('board.memory.reflected', 'grooming', {
					memoryCount: memoryIds.length,
					title: parsed.title,
				});
			}
			return true;
		}

		return false;
	}

	/** Run all grooming phases */
	async groom() {
		console.log('[grooming] Running grooming cycle...');

		const archived = this.phaseArchive();
		const consolidated = this.phaseConsolidate();
		const reflected = this.phaseReflect();
		const pruned = this.phasePrune();

		this.memory.setLastGroomed();

		if (archived + consolidated + reflected + pruned > 0) {
			console.log(`[grooming] Done: ${archived} archived, ${consolidated} consolidation(s), ${reflected} reflection(s), ${pruned} pruned`);
			this.eventBus.emit('board.grooming.complete', 'grooming', {
				archived, consolidated, reflected, pruned,
			});
		}
	}

	/** Phase 1: Move completed board tasks to archive */
	private phaseArchive(): number {
		const now = Date.now();
		let archived = 0;

		// Get done and failed tasks
		const doneTasks = this.board.getColumn('done');
		const failedTasks = this.board.getColumn('failed');
		const allCompleted = [...doneTasks, ...failedTasks];

		// Archive tasks older than threshold
		for (const task of allCompleted) {
			const completedAt = task.completedAt ? new Date(task.completedAt).getTime() : now;
			if (now - completedAt >= this.config.archiveAfterMs) {
				this.memory.archive(task);
				this.board.remove(task.id);
				archived++;
			}
		}

		// Force archive if board is too large (oldest first)
		const boardSize = this.board.getBoard().stats.total;
		if (boardSize > this.config.maxBoardSize) {
			const excess = boardSize - this.config.maxBoardSize;
			const oldest = allCompleted
				.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
				.slice(0, excess);

			for (const task of oldest) {
				if (!this.memory.get(task.id)) { // not already archived
					this.memory.archive(task);
					this.board.remove(task.id);
					archived++;
				}
			}
		}

		return archived;
	}

	/** Check if an archive is garbage (error message, not real work) */
	private isGarbageArchive(node: MemoryNode): boolean {
		const s = node.summary.toLowerCase();
		return s.includes('agent is already processing') ||
			s.includes('task queue full') ||
			s.includes('pi agent not available') ||
			s.includes('no pi daemon') ||
			(s.includes('error') && node.summary.length < 80);
	}

	/** Phase 2: Group orphan archives → AI-summarized memory nodes */
	private phaseConsolidate(): number {
		const allOrphans = this.memory.getOrphanArchives();

		// Filter out garbage archives — consolidate them silently as junk
		const garbage = allOrphans.filter(n => this.isGarbageArchive(n));
		if (garbage.length > 0) {
			this.memory.consolidate(
				garbage.map(n => n.id),
				'Failed/rejected tasks',
				`${garbage.length} tasks that failed due to system errors (not real work)`,
			);
			console.log(`[grooming] Filtered ${garbage.length} garbage archives`);
		}

		const orphans = allOrphans.filter(n => !this.isGarbageArchive(n));
		if (orphans.length < this.config.consolidateMinGroup) return 0;

		// Group by tags/themes
		const groups = this.groupByTags(orphans);
		let consolidations = 0;

		for (const [theme, nodes] of groups) {
			if (nodes.length < this.config.consolidateMinGroup) continue;

			// Request AI summary
			const taskId = `groom-consolidate-${makeId()}`;
			const archiveIds = nodes.map(n => n.id);
			this.pendingConsolidations.set(taskId, archiveIds);

			const context = nodes.map(n =>
				`- ${n.title} (${n.tags.join(', ')}): ${n.summary.slice(0, 100)}`
			).join('\n');

			this.sendToAI(taskId, `Summarize this group of ${nodes.length} completed tasks into a single compact memory entry.

THEME: ${theme}
TASKS:
${context}

Respond in this exact format:
TITLE: <short title for this group of work>
SUMMARY: <2-3 sentence summary of what was accomplished>
THEMES: <comma-separated themes/categories>`);

			consolidations++;
		}

		return consolidations;
	}

	/** Phase 3: Group orphan memories → AI-generated reflections */
	private phaseReflect(): number {
		const orphans = this.memory.getOrphanMemories();
		if (orphans.length < this.config.reflectMinGroup) return 0;

		// Group memories by theme similarity
		const groups = this.groupByTags(orphans);
		let reflections = 0;

		for (const [theme, nodes] of groups) {
			if (nodes.length < this.config.reflectMinGroup) continue;

			const taskId = `groom-reflect-${makeId()}`;
			const memoryIds = nodes.map(n => n.id);
			this.pendingReflections.set(taskId, memoryIds);

			const context = nodes.map(n =>
				`- ${n.title} (${n.taskCount} tasks, ${n.tags.join(', ')}): ${n.summary.slice(0, 150)}`
			).join('\n');

			this.sendToAI(taskId, `Distill high-level insights from these ${nodes.length} groups of completed work. What patterns, decisions, and knowledge should be remembered?

MEMORY GROUPS:
${context}

Respond in this exact format:
TITLE: <high-level title for this body of knowledge>
SUMMARY: <3-4 sentence reflection on what was built, key decisions, and state of things>
LEARNINGS: <comma-separated key learnings/insights>`);

			reflections++;
		}

		return reflections;
	}

	/** Phase 4: Prune old archive data */
	private phasePrune(): number {
		return this.memory.pruneArchives(this.config.pruneAfterMs);
	}

	// --- Helpers ---

	private groupByTags(nodes: MemoryNode[]): Map<string, MemoryNode[]> {
		const groups = new Map<string, MemoryNode[]>();

		for (const node of nodes) {
			// Use first tag as primary theme, or 'general'
			const theme = node.tags[0] || 'general';
			if (!groups.has(theme)) groups.set(theme, []);
			groups.get(theme)!.push(node);
		}

		// Also group untagged by title similarity (simple word overlap)
		const general = groups.get('general') || [];
		if (general.length >= this.config.consolidateMinGroup) {
			// Keep as one group
		} else {
			// Try to merge small groups
			const merged = new Map<string, MemoryNode[]>();
			for (const [theme, nodes] of groups) {
				if (nodes.length < this.config.consolidateMinGroup) {
					const existing = merged.get('misc') || [];
					merged.set('misc', [...existing, ...nodes]);
				} else {
					merged.set(theme, nodes);
				}
			}
			return merged;
		}

		return groups;
	}

	private sendToAI(taskId: string, prompt: string) {
		const piDaemons = this.registry.getByType('pi').filter(d => d.status === 'alive');
		if (piDaemons.length === 0) {
			console.log('[grooming] No Pi daemon available for AI task');
			return;
		}

		this.router.sendTo(piDaemons[0].id, {
			id: makeId(),
			from: 'master',
			to: piDaemons[0].id,
			type: 'task',
			payload: {
				taskId,
				instruction: prompt,
				context: 'Board grooming — respond concisely in the exact format requested.',
				priority: 'low',
			},
			timestamp: new Date().toISOString(),
		});
	}

	private parseSummary(text: string): { title: string; summary: string; themes?: string[] } | null {
		const title = text.match(/TITLE:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
		const summary = text.match(/SUMMARY:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
		const themes = text.match(/THEMES:\s*(.+?)(?:\n|$)/i)?.[1]?.trim()
			?.split(',').map(s => s.trim()).filter(Boolean);

		if (!title || !summary) return null;
		return { title, summary, themes };
	}

	private parseReflection(text: string): { title: string; summary: string; learnings?: string[] } | null {
		const title = text.match(/TITLE:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
		const summary = text.match(/SUMMARY:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
		const learnings = text.match(/LEARNINGS:\s*(.+?)(?:\n|$)/i)?.[1]?.trim()
			?.split(',').map(s => s.trim()).filter(Boolean);

		if (!title || !summary) return null;
		return { title, summary, learnings };
	}

	getStatus() {
		return {
			running: !!this.timer,
			config: this.config,
			pendingConsolidations: this.pendingConsolidations.size,
			pendingReflections: this.pendingReflections.size,
			memoryStats: this.memory.getStats(),
		};
	}
}
