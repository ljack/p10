<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { pipelineStore, type Pipeline, type PipelineTask } from '$lib/stores/pipelines.svelte';

	let expandedPipeline = $state<string | null>(null);

	function toggleExpand(id: string) {
		expandedPipeline = expandedPipeline === id ? null : id;
	}

	function taskIcon(status: string): string {
		switch (status) {
			case 'completed': return '✅';
			case 'active': return '🔄';
			case 'failed': return '❌';
			case 'skipped': return '⏭';
			default: return '○';
		}
	}

	function pipelineIcon(status: string): string {
		switch (status) {
			case 'completed': return '✅';
			case 'executing': return '▶';
			case 'planning': return '📋';
			case 'failed': return '❌';
			default: return '○';
		}
	}

	function roleColor(role: string): string {
		switch (role) {
			case 'api_agent': return 'text-blue-400';
			case 'web_agent': return 'text-green-400';
			case 'review_agent': return 'text-yellow-400';
			case 'planning_agent': return 'text-purple-400';
			default: return 'text-muted';
		}
	}

	function roleLabel(role: string): string {
		switch (role) {
			case 'api_agent': return 'API';
			case 'web_agent': return 'Web';
			case 'review_agent': return 'Review';
			case 'planning_agent': return 'Plan';
			default: return role;
		}
	}

	function elapsed(from: string): string {
		const ms = Date.now() - new Date(from).getTime();
		const s = Math.floor(ms / 1000);
		if (s < 60) return `${s}s ago`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		return `${h}h ${m % 60}m ago`;
	}

	function completedCount(pipeline: Pipeline): number {
		return pipeline.tasks.filter(t => t.status === 'completed').length;
	}

	function progressPct(pipeline: Pipeline): number {
		if (pipeline.totalTasks === 0) return 0;
		return Math.round((completedCount(pipeline) / pipeline.totalTasks) * 100);
	}

	// Poll for updates (complements WebSocket push)
	let pollTimer: ReturnType<typeof setInterval>;
	
	onMount(() => {
		pipelineStore.fetchFromMaster();
		pollTimer = setInterval(() => pipelineStore.fetchFromMaster(), 5000);
	});

	onDestroy(() => {
		clearInterval(pollTimer);
	});
</script>

<div class="text-xs space-y-2">
	{#if pipelineStore.count === 0}
		<div class="text-muted italic py-2">
			No pipelines yet. Use <code class="bg-background px-1 rounded">mesh_pipeline</code> to start one.
		</div>
	{:else}
		<!-- Active pipelines -->
		{#each pipelineStore.active as pipeline (pipeline.id)}
			<div class="border border-accent/30 rounded p-2 bg-accent/5">
				<!-- Header -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div onclick={() => toggleExpand(pipeline.id)} class="cursor-pointer">
					<div class="flex items-center gap-2">
						<span class="animate-pulse">{pipelineIcon(pipeline.status)}</span>
						<span class="text-foreground font-medium flex-1 truncate">
							{pipeline.instruction.slice(0, 80)}{pipeline.instruction.length > 80 ? '…' : ''}
						</span>
						<span class="text-accent shrink-0">
							{completedCount(pipeline)}/{pipeline.totalTasks}
						</span>
					</div>

					<!-- Progress bar -->
					<div class="mt-1.5 h-1 bg-panel-border rounded-full overflow-hidden">
						<div
							class="h-full bg-accent rounded-full transition-all duration-500"
							style="width: {progressPct(pipeline)}%"
						></div>
					</div>
				</div>

				<!-- Task list (always visible for active pipelines) -->
				<div class="mt-2 space-y-1">
					{#each pipeline.tasks as task (task.id)}
						<div class="flex items-start gap-1.5 py-0.5">
							<span class="shrink-0 {task.status === 'active' ? 'animate-spin' : ''}">{taskIcon(task.status)}</span>
							<span class="shrink-0 font-mono {roleColor(task.role)}">
								{roleLabel(task.role)}
							</span>
							<span class="text-muted truncate flex-1">
								{task.instruction.slice(0, 70)}{task.instruction.length > 70 ? '…' : ''}
							</span>
						</div>
						{#if task.status === 'failed' && task.result}
							<div class="ml-6 text-error bg-error/10 rounded px-1.5 py-0.5 break-words">
								{task.result.slice(0, 150)}
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}

		<!-- Recent pipelines (collapsed by default) -->
		{#each pipelineStore.recent as pipeline (pipeline.id)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				onclick={() => toggleExpand(pipeline.id)}
				class="border border-panel-border rounded p-2 cursor-pointer hover:border-accent/20 transition-colors"
			>
				<div class="flex items-center gap-2">
					<span>{pipelineIcon(pipeline.status)}</span>
					<span class="text-foreground flex-1 truncate">
						{pipeline.instruction.slice(0, 80)}{pipeline.instruction.length > 80 ? '…' : ''}
					</span>
					<span class="text-muted shrink-0">
						{completedCount(pipeline)}/{pipeline.totalTasks}
					</span>
					<span class="text-muted shrink-0">{elapsed(pipeline.updatedAt)}</span>
				</div>

				{#if expandedPipeline === pipeline.id}
					<div class="mt-2 pt-2 border-t border-panel-border space-y-1">
						{#each pipeline.tasks as task (task.id)}
							<div class="flex items-start gap-1.5 py-0.5">
								<span class="shrink-0">{taskIcon(task.status)}</span>
								<span class="shrink-0 font-mono {roleColor(task.role)}">
									{roleLabel(task.role)}
								</span>
								<span class="text-muted flex-1 break-words">
									{task.instruction.slice(0, 100)}
								</span>
							</div>
							{#if task.result}
								<div class="ml-6 text-muted bg-panel-bg rounded px-1.5 py-0.5 break-words">
									{task.result.slice(0, 200)}{task.result.length > 200 ? '…' : ''}
								</div>
							{/if}
						{/each}
						<div class="text-muted pt-1">ID: {pipeline.id}</div>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>
