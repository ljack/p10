<script lang="ts">
	import { agentState } from '$lib/stores/agentState.svelte';
	import { subscribe, type ContainerState } from '$lib/sandbox/container';
	import { onMount } from 'svelte';

	let containerState = $state<ContainerState>({
		status: 'idle',
		serverStatus: 'stopped',
		serverUrl: null, servers: [],
		error: null
	});

	onMount(() => subscribe((s) => (containerState = s)));

	const statusConfig = {
		idle: { icon: '○', color: 'text-muted', label: 'idle' },
		thinking: { icon: '●', color: 'text-accent', label: 'thinking' },
		writing: { icon: '●', color: 'text-accent', label: 'writing code' },
		executing: { icon: '◐', color: 'text-warning', label: 'running tool' },
		error: { icon: '●', color: 'text-error', label: 'error' }
	} as const;

	let agentConfig = $derived(statusConfig[agentState.status]);
</script>

<div class="h-7 flex items-center px-3 border-t border-panel-border bg-panel-bg shrink-0 gap-4">
	<span class="text-muted text-xs font-bold">AGENTS</span>

	<div class="flex items-center gap-1.5 text-xs">
		<span class={agentConfig.color}>
			{#if agentState.status === 'thinking' || agentState.status === 'writing'}
				<span class="animate-pulse">{agentConfig.icon}</span>
			{:else}
				{agentConfig.icon}
			{/if}
		</span>
		<span class="text-foreground">Agent</span>
		<span class="text-muted">— {agentState.task || agentConfig.label}</span>
	</div>

	<div class="flex-1"></div>

	<!-- Container status -->
	<div class="text-xs text-muted">
		{#if containerState.status === 'booting'}
			⏳ container
		{:else if containerState.serverStatus === 'running'}
			🟢 preview
		{:else if containerState.status === 'error'}
			🔴 container
		{/if}
	</div>
</div>
