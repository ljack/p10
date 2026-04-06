/**
 * Task Analyst Agent — autonomously enriches new human-created tasks.
 * 
 * After a configurable delay, reads new tasks and sends them to the Pi Daemon
 * for AI analysis. The agent adds:
 * - Rewritten title (clearer, actionable)
 * - Questions that need answering
 * - Ideas / implementation suggestions
 * - Dependencies on other board tasks
 * - Suggested tags
 */

import type { TaskBoard, BoardTask, TaskAnalysis } from './taskBoard.js';
import type { MessageRouter } from './router.js';
import type { DaemonRegistry } from './registry.js';
import type { MeshEventBus } from './eventBus.js';
import type { BoardMemory } from './boardMemory.js';
import { makeId } from './types.js';

export interface TaskAnalystConfig {
	/** Delay before analyzing a new task (ms). Default: 10000 */
	analysisDelayMs: number;
	/** How often to check for new tasks (ms). Default: 3000 */
	pollIntervalMs: number;
	/** Max tasks to analyze per cycle. Default: 3 */
	batchSize: number;
}

const DEFAULT_CONFIG: TaskAnalystConfig = {
	analysisDelayMs: 10_000,
	pollIntervalMs: 3_000,
	batchSize: 3,
};

export class TaskAnalyst {
	private board: TaskBoard;
	private router: MessageRouter;
	private registry: DaemonRegistry;
	private eventBus: MeshEventBus;
	private config: TaskAnalystConfig;
	private memory: BoardMemory | null = null;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private analyzing = new Set<string>(); // task IDs currently being analyzed
	private pendingResponses = new Map<string, string>(); // queryId → taskId

	constructor(
		board: TaskBoard,
		router: MessageRouter,
		registry: DaemonRegistry,
		eventBus: MeshEventBus,
		config?: Partial<TaskAnalystConfig>,
	) {
		this.board = board;
		this.router = router;
		this.registry = registry;
		this.eventBus = eventBus;
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/** Set memory store for context injection */
	setMemory(memory: BoardMemory) {
		this.memory = memory;
	}

	/** Start the analyst polling loop */
	start() {
		if (this.pollTimer) return;

		this.pollTimer = setInterval(() => {
			this.checkForNewTasks();
		}, this.config.pollIntervalMs);

		console.log(`[analyst] Started (delay: ${this.config.analysisDelayMs}ms, poll: ${this.config.pollIntervalMs}ms)`);
	}

	/** Stop the analyst */
	stop() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
	}

	/** Handle task_result messages that might be analysis responses */
	handleTaskResult(taskId: string, result: any) {
		// Check if this is a response to one of our analysis requests
		const boardTaskId = this.pendingResponses.get(taskId);
		if (!boardTaskId) return false;

		this.pendingResponses.delete(taskId);
		this.analyzing.delete(boardTaskId);

		if (result?.error) {
			console.log(`[analyst] Analysis failed for ${boardTaskId}: ${result.error}`);
			return true;
		}

		try {
			const text = result?.result || result?.success && result.result || '';
			const analysis = this.parseAnalysis(text);
			if (analysis) {
				this.board.setAnalysis(boardTaskId, analysis);
			}
		} catch (err: any) {
			console.log(`[analyst] Parse error for ${boardTaskId}: ${err.message}`);
		}

		return true;
	}

	/** Check for tasks ready to be analyzed */
	private checkForNewTasks() {
		const now = Date.now();
		const unanalyzed = this.board.getUnanalyzed();

		// Filter to tasks old enough and not already being analyzed
		const ready = unanalyzed.filter(t => {
			const age = now - new Date(t.createdAt).getTime();
			return age >= this.config.analysisDelayMs && !this.analyzing.has(t.id);
		});

		if (ready.length === 0) return;

		// Take a batch
		const batch = ready.slice(0, this.config.batchSize);

		for (const task of batch) {
			this.analyzeTask(task);
		}
	}

	/** Send a task to the Pi Daemon for analysis */
	private analyzeTask(task: BoardTask) {
		// Find an alive Pi daemon
		const piDaemons = this.registry.getByType('pi').filter(d => d.status === 'alive');
		if (piDaemons.length === 0) return;

		this.analyzing.add(task.id);

		const analysisTaskId = `analyst-${makeId()}`;
		this.pendingResponses.set(analysisTaskId, task.id);

		// Build context from other board tasks for dependency detection
		const boardContext = this.board.getColumn('planned')
			.filter(t => t.id !== task.id)
			.map(t => `- ${t.title}`)
			.slice(0, 15)
			.join('\n');

		// Get relevant memories from past work
		const memoryContext = this.memory?.getContext(task.title) || '';

		const prompt = `You are a task analyst for a software development project. Analyze this new task and provide structured enrichment.

TASK TITLE: "${task.title}"
${task.description ? `DESCRIPTION: "${task.description}"` : ''}
${task.tags?.length ? `TAGS: ${task.tags.join(', ')}` : ''}

OTHER PLANNED TASKS:
${boardContext || '(none)'}
${memoryContext ? `\nRELEVANT PAST WORK (from project memory):\n${memoryContext}` : ''}

Respond with EXACTLY this format (keep each section brief, 1-2 sentences max):

REWRITTEN_TITLE: <clearer, actionable version of the title>
QUESTIONS: <comma-separated questions that need answering, or "none">
IDEAS: <comma-separated implementation ideas/suggestions, or "none">  
DEPENDENCIES: <comma-separated titles of tasks this depends on from the list above, or "none">
TAGS: <comma-separated suggested tags, or "none">
SUMMARY: <one sentence summary of what this task involves>`;

		// Route as a task to the Pi daemon
		const message = {
			id: makeId(),
			from: 'master',
			to: piDaemons[0].id,
			type: 'task' as const,
			payload: {
				taskId: analysisTaskId,
				instruction: prompt,
				context: 'Task analysis — respond concisely in the exact format requested.',
				priority: 'low',
			},
			timestamp: new Date().toISOString(),
		};

		this.router.sendTo(piDaemons[0].id, message);
		console.log(`[analyst] Analyzing: "${task.title.slice(0, 60)}" → ${piDaemons[0].name}`);

		// Timeout: if no response in 60s, give up
		setTimeout(() => {
			if (this.analyzing.has(task.id)) {
				this.analyzing.delete(task.id);
				this.pendingResponses.delete(analysisTaskId);
				console.log(`[analyst] Timeout for: "${task.title.slice(0, 40)}"`);
			}
		}, 60_000);
	}

	/** Parse the AI response into a TaskAnalysis object */
	private parseAnalysis(text: string): TaskAnalysis | null {
		if (!text || text.length < 10) return null;

		const get = (key: string): string | undefined => {
			const match = text.match(new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`, 'i'));
			return match?.[1]?.trim();
		};

		const split = (val: string | undefined): string[] => {
			if (!val || val.toLowerCase() === 'none') return [];
			return val.split(',').map(s => s.trim()).filter(Boolean);
		};

		const rewrittenTitle = get('REWRITTEN_TITLE');
		const questions = split(get('QUESTIONS'));
		const ideas = split(get('IDEAS'));
		const dependencies = split(get('DEPENDENCIES'));
		const suggestedTags = split(get('TAGS'));
		const summary = get('SUMMARY');

		// Need at least something useful
		if (!rewrittenTitle && questions.length === 0 && ideas.length === 0 && !summary) {
			return null;
		}

		return {
			rewrittenTitle: rewrittenTitle || undefined,
			questions: questions.length > 0 ? questions : undefined,
			ideas: ideas.length > 0 ? ideas : undefined,
			dependencies: dependencies.length > 0 ? dependencies : undefined,
			suggestedTags: suggestedTags.length > 0 ? suggestedTags : undefined,
			summary: summary || undefined,
			analyzedAt: new Date().toISOString(),
		};
	}

	/** Get analyst status */
	getStatus() {
		return {
			running: !!this.pollTimer,
			config: this.config,
			analyzing: Array.from(this.analyzing),
			pendingResponses: this.pendingResponses.size,
		};
	}
}
