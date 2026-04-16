<script lang="ts">
	import { goto } from '$app/navigation';
	import { browserDaemon } from '$lib/daemon/browserDaemon.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let { projectId, projectName }: { projectId: string; projectName?: string } = $props();

	function handleLogout() {
		auth.logout();
		goto('/');
	}
</script>

<div class="h-10 flex items-center justify-between px-4 border-b border-panel-border bg-panel-bg shrink-0">
	<div class="flex items-center gap-3">
		<a href="/dashboard" class="text-accent font-bold text-sm tracking-wider hover:opacity-80 transition-opacity" title="Back to Dashboard">P10</a>
		<span class="text-muted text-xs">—</span>
		<span class="text-foreground text-sm">{projectName || projectId}</span>
	</div>

	<div class="flex items-center gap-4">
		{#if browserDaemon.connected}
			<span class="text-accent text-xs" title="Connected to Master Daemon">🔗 mesh</span>
		{:else}
			<span class="text-muted text-xs" title="Master Daemon not connected">○ offline</span>
		{/if}
		{#if auth.user}
			<span class="text-muted text-xs">👤 {auth.user.username}</span>
		{/if}
		<button onclick={handleLogout} class="text-muted hover:text-foreground text-xs transition-colors">Logout</button>
	</div>
</div>
