/**
 * Reactive pipeline store — tracks active and recent pipelines from the mesh.
 * Fed by browser daemon WebSocket pipeline_progress events + REST polling.
 */

export interface PipelineTask {
	id: string;
	role: string;
	instruction: string;
	status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
	result?: string;
}

export interface Pipeline {
	id: string;
	instruction: string;
	status: 'planning' | 'executing' | 'completed' | 'failed';
	currentTaskIndex: number;
	totalTasks: number;
	tasks: PipelineTask[];
	updatedAt: string;
}

const MAX_RECENT = 20;

class PipelineStore {
	pipelines = $state<Map<string, Pipeline>>(new Map());

	/** Update a pipeline from a pipeline_progress event */
	update(payload: any) {
		const id = payload.pipelineId;
		if (!id) return;

		const existing = this.pipelines.get(id);
		const pipeline: Pipeline = {
			id,
			instruction: payload.instruction || existing?.instruction || '',
			status: payload.status || 'executing',
			currentTaskIndex: payload.currentTaskIndex ?? 0,
			totalTasks: payload.totalTasks ?? payload.tasks?.length ?? 0,
			tasks: payload.tasks || existing?.tasks || [],
			updatedAt: new Date().toISOString(),
		};

		this.pipelines.set(id, pipeline);
		this.prune();
	}

	/** Get active (executing) pipelines */
	get active(): Pipeline[] {
		return Array.from(this.pipelines.values())
			.filter(p => p.status === 'executing' || p.status === 'planning');
	}

	/** Get recent completed/failed pipelines */
	get recent(): Pipeline[] {
		return Array.from(this.pipelines.values())
			.filter(p => p.status === 'completed' || p.status === 'failed')
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	}

	/** Get all pipelines ordered by most recent */
	get all(): Pipeline[] {
		return Array.from(this.pipelines.values())
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	}

	/** Whether there are any active pipelines */
	get hasActive(): boolean {
		return this.active.length > 0;
	}

	/** Total count */
	get count(): number {
		return this.pipelines.size;
	}

	/** Load from REST API */
	async fetchFromMaster() {
		try {
			// Use project-scoped endpoint if available
			const { activeProject } = await import('./project.svelte');
			const url = activeProject.isActive
				? `${activeProject.apiBase}/pipelines`
				: '/api/pipelines';
			const resp = await fetch(url);
			if (!resp.ok) return;
			const data = await resp.json();

			for (const p of [...(data.active || []), ...(data.recent || [])]) {
				this.update({
					pipelineId: p.id,
					instruction: p.instruction,
					status: p.status,
					currentTaskIndex: p.currentTaskIndex,
					totalTasks: p.tasks?.length,
					tasks: p.tasks,
				});
			}
		} catch { /* ignore */ }
	}

	private prune() {
		const completed = this.recent;
		if (completed.length > MAX_RECENT) {
			for (const p of completed.slice(MAX_RECENT)) {
				this.pipelines.delete(p.id);
			}
		}
	}
}

export const pipelineStore = new PipelineStore();
