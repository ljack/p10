<script lang="ts">
	interface AgentInfo {
		name: string;
		status: 'idle' | 'working' | 'waiting' | 'error';
		task?: string;
	}

	const agents: AgentInfo[] = [{ name: 'Agent', status: 'idle' }];

	const statusIndicator: Record<AgentInfo['status'], { icon: string; color: string }> = {
		idle: { icon: '○', color: 'text-muted' },
		working: { icon: '●', color: 'text-accent' },
		waiting: { icon: '◐', color: 'text-warning' },
		error: { icon: '●', color: 'text-error' }
	};
</script>

<div class="h-7 flex items-center px-3 border-t border-panel-border bg-panel-bg shrink-0 gap-4">
	<span class="text-muted text-xs font-bold">AGENTS</span>
	{#each agents as agent}
		{@const indicator = statusIndicator[agent.status]}
		<div class="flex items-center gap-1.5 text-xs">
			<span class={indicator.color}>{indicator.icon}</span>
			<span class="text-foreground">{agent.name}</span>
			{#if agent.task}
				<span class="text-muted truncate max-w-48">— {agent.task}</span>
			{/if}
		</div>
	{/each}
</div>
