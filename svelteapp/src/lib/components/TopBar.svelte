<script lang="ts">
	import { browserDaemon } from '$lib/daemon/browserDaemon.svelte';

	let { projectId }: { projectId: string } = $props();
</script>

<div class="h-10 flex items-center justify-between px-4 border-b border-panel-border bg-panel-bg shrink-0">
	<div class="flex items-center gap-3">
		<span class="text-accent font-bold text-sm tracking-wider">P10</span>
		<span class="text-muted text-xs">—</span>
		<span class="text-foreground text-sm">{projectId}</span>
	</div>

	<div class="flex items-center gap-4">
		{#if browserDaemon.connected}
			<span class="text-accent text-xs" title="Connected to Master Daemon">🔗 mesh</span>
		{:else}
			<span class="text-muted text-xs" title="Master Daemon not connected">○ offline</span>
		{/if}
		<button class="text-muted hover:text-foreground text-xs transition-colors">⚙️ Settings</button>
	</div>
</div>
