/**
 * Model Router — picks the best model for each task type with failover.
 * Uses pi's ModelRegistry to find available models.
 */

import type { AuthStorage, ModelRegistry } from '@mariozechner/pi-coding-agent';

export type TaskType = 'planning' | 'coding' | 'quick-fix' | 'review' | 'query' | 'default';

/** Model preference order per task type */
const MODEL_PREFERENCES: Record<TaskType, string[][]> = {
	planning: [
		['anthropic', 'claude-opus-4-5'],
		['anthropic', 'claude-sonnet-4'],
		['openai', 'gpt-4o'],
	],
	coding: [
		['anthropic', 'claude-sonnet-4'],
		['anthropic', 'claude-opus-4-5'],
		['openai', 'gpt-4o'],
	],
	'quick-fix': [
		['anthropic', 'claude-haiku-3'],
		['anthropic', 'claude-sonnet-4'],
		['openai', 'gpt-4o-mini'],
	],
	review: [
		['anthropic', 'claude-sonnet-4'],
		['openai', 'gpt-4o'],
	],
	query: [
		['anthropic', 'claude-haiku-3'],
		['anthropic', 'claude-sonnet-4'],
	],
	default: [
		['anthropic', 'claude-sonnet-4'],
		['anthropic', 'claude-opus-4-5'],
		['anthropic', 'claude-haiku-3'],
		['openai', 'gpt-4o'],
	],
};

export class ModelRouter {
	private modelRegistry: ModelRegistry;
	private failedModels = new Set<string>();
	private cooldowns = new Map<string, number>(); // model key → timestamp when cooldown ends

	constructor(modelRegistry: ModelRegistry) {
		this.modelRegistry = modelRegistry;
	}

	/** Get the best available model for a task type */
	async getBestModel(taskType: TaskType = 'default') {
		const preferences = MODEL_PREFERENCES[taskType] || MODEL_PREFERENCES.default;
		const available = await this.modelRegistry.getAvailable();

		for (const [provider, modelId] of preferences) {
			const key = `${provider}/${modelId}`;

			// Skip if in cooldown
			const cooldownEnd = this.cooldowns.get(key);
			if (cooldownEnd && Date.now() < cooldownEnd) continue;

			// Skip if recently failed
			if (this.failedModels.has(key)) continue;

			// Find in available models
			const model = available.find(
				(m) => m.provider === provider && m.id.includes(modelId)
			);
			if (model) {
				console.log(`[model-router] Selected ${key} for ${taskType}`);
				return model;
			}
		}

		// Fallback: any available model
		if (available.length > 0) {
			console.log(`[model-router] Fallback to ${available[0].id}`);
			return available[0];
		}

		return null;
	}

	/** Report a model failure (throttle, out of credits, etc.) */
	reportFailure(provider: string, modelId: string, reason: string) {
		const key = `${provider}/${modelId}`;
		console.log(`[model-router] Model failed: ${key} — ${reason}`);

		if (reason.includes('rate') || reason.includes('throttle') || reason.includes('429')) {
			// Cooldown for 60 seconds
			this.cooldowns.set(key, Date.now() + 60_000);
		} else if (reason.includes('credit') || reason.includes('quota') || reason.includes('402')) {
			// Cooldown for 5 minutes
			this.cooldowns.set(key, Date.now() + 300_000);
		} else {
			// Permanent failure until reset
			this.failedModels.add(key);
		}
	}

	/** Reset all failures and cooldowns */
	reset() {
		this.failedModels.clear();
		this.cooldowns.clear();
	}

	/** Classify task into a task type based on the instruction */
	classifyTask(instruction: string): TaskType {
		const lower = instruction.toLowerCase();

		if (lower.includes('plan') || lower.includes('design') || lower.includes('architect')) {
			return 'planning';
		}
		if (lower.includes('fix') || lower.includes('error') || lower.includes('bug') || lower.includes('quick')) {
			return 'quick-fix';
		}
		if (lower.includes('review') || lower.includes('check') || lower.includes('quality')) {
			return 'review';
		}
		if (lower.includes('?') || lower.includes('what') || lower.includes('how') || lower.includes('explain')) {
			return 'query';
		}
		if (lower.includes('build') || lower.includes('create') || lower.includes('implement') || lower.includes('code')) {
			return 'coding';
		}

		return 'default';
	}
}
