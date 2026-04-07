/**
 * Board Memory — Progressive knowledge compression for the task board.
 * 
 * Tiers: active board → archive → memory → reflection
 * Each tier compresses further but maintains paths back to sources.
 * Like LLM memory: keep working context small, compress the rest.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { makeId } from './types.js';

export type MemoryTier = 'archive' | 'memory' | 'reflection';

export interface MemoryNode {
	id: string;
	tier: MemoryTier;
	title: string;
	summary: string;
	parentId?: string;
	childIds: string[];
	path: string;
	tags: string[];
	taskCount: number;
	timespan: { from: string; to: string };
	createdAt: string;
	sourceExists: boolean;
	metadata?: {
		originalTaskIds?: string[];
		themes?: string[];
		learnings?: string[];
		originalData?: any; // full task data, pruned after expiry
	};
}

export interface MemoryStore {
	nodes: Record<string, MemoryNode>;
	stats: { archives: number; memories: number; reflections: number };
	lastGroomed: string;
}

const STORE_FILE = process.env.P10_MEMORY_FILE || '/tmp/p10-board-memory.json';

export class BoardMemory {
	private store: MemoryStore;

	constructor() {
		this.store = this.load();
	}

	// --- CRUD ---

	/** Add a node to memory */
	addNode(node: Omit<MemoryNode, 'id' | 'createdAt'>): MemoryNode {
		const full: MemoryNode = {
			...node,
			id: makeId(),
			createdAt: new Date().toISOString(),
		};
		this.store.nodes[full.id] = full;
		this.updateStats();
		this.save();
		console.log(`[memory] + ${full.tier}: "${full.title.slice(0, 60)}" (${full.taskCount} tasks)`);
		return full;
	}

	/** Archive a completed board task */
	archive(task: {
		id: string; title: string; instruction?: string; description?: string;
		tags?: string[]; result?: string; createdAt: string; completedAt?: string;
		origin?: any; priority?: string; analysis?: any;
	}): MemoryNode {
		return this.addNode({
			tier: 'archive',
			title: task.title,
			summary: task.result?.slice(0, 300) || task.description || task.instruction || task.title,
			childIds: [],
			path: `archive/${task.id}`,
			tags: task.tags || [],
			taskCount: 1,
			timespan: {
				from: task.createdAt,
				to: task.completedAt || new Date().toISOString(),
			},
			sourceExists: true,
			metadata: {
				originalTaskIds: [task.id],
				originalData: {
					...task,
					// Keep analysis if it exists
					analysis: task.analysis,
				},
			},
		});
	}

	/** Create a memory node from a group of archives */
	consolidate(archiveIds: string[], title: string, summary: string, themes?: string[]): MemoryNode | null {
		const archives = archiveIds.map(id => this.store.nodes[id]).filter(Boolean);
		if (archives.length === 0) return null;

		const tags = [...new Set(archives.flatMap(a => a.tags))];
		const timespans = archives.map(a => a.timespan);
		const from = timespans.reduce((min, t) => t.from < min ? t.from : min, timespans[0].from);
		const to = timespans.reduce((max, t) => t.to > max ? t.to : max, timespans[0].to);

		const node = this.addNode({
			tier: 'memory',
			title,
			summary,
			childIds: archiveIds,
			path: `memory/${makeId()}`,
			tags,
			taskCount: archives.reduce((sum, a) => sum + a.taskCount, 0),
			timespan: { from, to },
			sourceExists: archives.every(a => a.sourceExists),
			metadata: {
				originalTaskIds: archives.flatMap(a => a.metadata?.originalTaskIds || []),
				themes,
			},
		});

		// Link archives to this memory
		for (const id of archiveIds) {
			if (this.store.nodes[id]) {
				this.store.nodes[id].parentId = node.id;
			}
		}

		this.save();
		return node;
	}

	/** Create a reflection from memory nodes */
	reflect(memoryIds: string[], title: string, summary: string, learnings?: string[]): MemoryNode | null {
		const memories = memoryIds.map(id => this.store.nodes[id]).filter(Boolean);
		if (memories.length === 0) return null;

		const tags = [...new Set(memories.flatMap(m => m.tags))];
		const timespans = memories.map(m => m.timespan);
		const from = timespans.reduce((min, t) => t.from < min ? t.from : min, timespans[0].from);
		const to = timespans.reduce((max, t) => t.to > max ? t.to : max, timespans[0].to);

		const node = this.addNode({
			tier: 'reflection',
			title,
			summary,
			childIds: memoryIds,
			path: `reflection/${makeId()}`,
			tags,
			taskCount: memories.reduce((sum, m) => sum + m.taskCount, 0),
			timespan: { from, to },
			sourceExists: memories.every(m => m.sourceExists),
			metadata: {
				themes: [...new Set(memories.flatMap(m => m.metadata?.themes || []))],
				learnings,
			},
		});

		// Link memories to this reflection
		for (const id of memoryIds) {
			if (this.store.nodes[id]) {
				this.store.nodes[id].parentId = node.id;
			}
		}

		this.save();
		return node;
	}

	// --- Query ---

	/** Get a node by ID */
	get(id: string): MemoryNode | undefined {
		return this.store.nodes[id];
	}

	/** Get all nodes of a tier */
	getByTier(tier: MemoryTier): MemoryNode[] {
		return Object.values(this.store.nodes).filter(n => n.tier === tier);
	}

	/** Get node with its children (one level) */
	getWithChildren(id: string): { node: MemoryNode; children: MemoryNode[] } | null {
		const node = this.store.nodes[id];
		if (!node) return null;
		const children = node.childIds.map(cid => this.store.nodes[cid]).filter(Boolean);
		return { node, children };
	}

	/** Navigate up the tree from a node */
	getPath(id: string): MemoryNode[] {
		const path: MemoryNode[] = [];
		let current = this.store.nodes[id];
		while (current) {
			path.unshift(current);
			current = current.parentId ? this.store.nodes[current.parentId] : undefined!;
		}
		return path;
	}

	/** Get reflections (top-level knowledge) */
	getReflections(): MemoryNode[] {
		return this.getByTier('reflection').sort((a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	}

	/** Search across all tiers */
	search(query: string, limit = 20): MemoryNode[] {
		const lower = query.toLowerCase();
		const terms = lower.split(/\s+/).filter(Boolean);

		const scored = Object.values(this.store.nodes).map(node => {
			let score = 0;
			const text = `${node.title} ${node.summary} ${node.tags.join(' ')}`.toLowerCase();

			for (const term of terms) {
				if (node.title.toLowerCase().includes(term)) score += 3;
				if (node.summary.toLowerCase().includes(term)) score += 2;
				if (node.tags.some(t => t.toLowerCase().includes(term))) score += 2;
				if (text.includes(term)) score += 1;
			}

			// Tier weight: reflections > memory > archive
			const tierWeight = { reflection: 1.5, memory: 1.2, archive: 1.0 };
			score *= tierWeight[node.tier];

			return { node, score };
		}).filter(s => s.score > 0);

		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, limit).map(s => s.node);
	}

	/** Get relevant context for a new task (for analyst enrichment) */
	getContext(taskTitle: string, maxResults = 5): string {
		const results = this.search(taskTitle, maxResults);
		if (results.length === 0) return '';

		return results.map(n => {
			const tierIcon = n.tier === 'reflection' ? '🧠' : n.tier === 'memory' ? '📦' : '📄';
			return `${tierIcon} [${n.tier}] ${n.title}: ${n.summary.slice(0, 150)}`;
		}).join('\n');
	}

	// --- Pruning ---

	/** Prune archive nodes older than maxAgeMs — remove originalData, keep summary */
	pruneArchives(maxAgeMs: number) {
		const cutoff = Date.now() - maxAgeMs;
		let pruned = 0;

		for (const node of Object.values(this.store.nodes)) {
			if (node.tier === 'archive' && new Date(node.createdAt).getTime() < cutoff) {
				if (node.metadata?.originalData) {
					delete node.metadata.originalData;
					node.sourceExists = false;
					pruned++;
				}
			}
		}

		if (pruned > 0) {
			console.log(`[memory] Pruned ${pruned} archive(s) — removed original data`);
			// Update parent sourceExists
			for (const node of Object.values(this.store.nodes)) {
				if (node.tier === 'memory' || node.tier === 'reflection') {
					const children = node.childIds.map(id => this.store.nodes[id]).filter(Boolean);
					node.sourceExists = children.every(c => c.sourceExists);
				}
			}
			this.save();
		}

		return pruned;
	}

	/** Get unparented archives (not yet consolidated into memory) */
	getOrphanArchives(): MemoryNode[] {
		return this.getByTier('archive').filter(a => !a.parentId);
	}

	/** Get unparented memories (not yet reflected) */
	getOrphanMemories(): MemoryNode[] {
		return this.getByTier('memory').filter(m => !m.parentId);
	}

	// --- Stats ---

	getStats() {
		return {
			...this.store.stats,
			totalNodes: Object.keys(this.store.nodes).length,
			orphanArchives: this.getOrphanArchives().length,
			orphanMemories: this.getOrphanMemories().length,
			lastGroomed: this.store.lastGroomed,
		};
	}

	/** Clear all memory nodes (for project reset) */
	clearAll(): number {
		const count = Object.keys(this.store.nodes).length;
		this.store.nodes = {};
		this.store.stats = { archives: 0, memories: 0, reflections: 0 };
		this.save();
		console.log(`[memory] Cleared ${count} memory nodes`);
		return count;
	}

	getFullStore(): MemoryStore {
		return this.store;
	}

	setLastGroomed() {
		this.store.lastGroomed = new Date().toISOString();
		this.save();
	}

	// --- Persistence ---

	private load(): MemoryStore {
		if (existsSync(STORE_FILE)) {
			try {
				return JSON.parse(readFileSync(STORE_FILE, 'utf-8'));
			} catch {
				console.log('[memory] Corrupt store file, starting fresh');
			}
		}
		return {
			nodes: {},
			stats: { archives: 0, memories: 0, reflections: 0 },
			lastGroomed: new Date().toISOString(),
		};
	}

	private save() {
		this.updateStats();
		writeFileSync(STORE_FILE, JSON.stringify(this.store, null, 2));
	}

	private updateStats() {
		const nodes = Object.values(this.store.nodes);
		this.store.stats = {
			archives: nodes.filter(n => n.tier === 'archive').length,
			memories: nodes.filter(n => n.tier === 'memory').length,
			reflections: nodes.filter(n => n.tier === 'reflection').length,
		};
	}
}

export const boardMemory = new BoardMemory();
