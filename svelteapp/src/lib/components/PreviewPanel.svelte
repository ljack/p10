<script lang="ts">
	import { onMount } from 'svelte';
	import {
		boot,
		startDevServer,
		subscribe,
		type ContainerState
	} from '$lib/sandbox/container';

	type PreviewTab = 'web' | 'api' | 'mobile';

	let activeTab = $state<PreviewTab>('web');
	let containerState = $state<ContainerState>({
		status: 'idle',
		serverStatus: 'stopped',
		serverUrl: null,
		error: null
	});
	let iframeEl = $state<HTMLIFrameElement>();

	const tabs: { id: PreviewTab; label: string }[] = [
		{ id: 'web', label: 'Web' },
		{ id: 'api', label: 'API' },
		{ id: 'mobile', label: 'Mobile' }
	];

	onMount(() => {
		const unsub = subscribe((state) => {
			containerState = state;
		});

		// Auto-boot the container
		bootContainer();

		return unsub;
	});

	async function bootContainer() {
		try {
			await boot();
			await startDevServer();
		} catch (err) {
			console.error('WebContainer boot failed:', err);
		}
	}

	function refreshPreview() {
		if (iframeEl && containerState.serverUrl) {
			iframeEl.src = containerState.serverUrl;
		}
	}

	// Status text for display
	function getStatusText(): string {
		if (containerState.status === 'booting') return '⏳ Booting WebContainer...';
		if (containerState.status === 'error') return `❌ ${containerState.error}`;
		if (containerState.serverStatus === 'starting') return '⏳ Starting dev server...';
		if (containerState.serverStatus === 'running') return '🟢 Dev server running';
		if (containerState.serverStatus === 'error') return `❌ ${containerState.error}`;
		if (containerState.status === 'ready') return '✅ Container ready';
		return '';
	}
</script>

<div class="h-full flex flex-col bg-panel-bg">
	<!-- Tab bar -->
	<div class="h-8 flex items-center px-2 border-b border-panel-border shrink-0 gap-1">
		<span class="text-accent text-xs font-bold mr-2">PREVIEW</span>
		{#each tabs as tab}
			<button
				onclick={() => (activeTab = tab.id)}
				class="px-2 py-0.5 text-xs rounded transition-colors {activeTab === tab.id
					? 'bg-accent-dim text-accent'
					: 'text-muted hover:text-foreground'}"
			>
				{tab.label}
			</button>
		{/each}

		<div class="flex-1"></div>

		<!-- Status -->
		<span class="text-muted text-xs mr-2">{getStatusText()}</span>

		<button
			onclick={refreshPreview}
			class="text-muted hover:text-foreground text-xs px-1 transition-colors"
			title="Refresh">↻</button
		>
	</div>

	<!-- Preview content -->
	<div class="flex-1 min-h-0 flex items-center justify-center">
		{#if activeTab === 'web'}
			{#if containerState.serverUrl}
				<iframe
					bind:this={iframeEl}
					src={containerState.serverUrl}
					title="Web Preview"
					class="w-full h-full border-none bg-white"
					sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
				></iframe>
			{:else}
				<div class="flex flex-col items-center gap-3 text-muted">
					<div
						class="w-64 h-40 border border-panel-border rounded flex items-center justify-center"
					>
						{#if containerState.status === 'booting' || containerState.serverStatus === 'starting'}
							<span class="text-xs animate-pulse">Loading...</span>
						{:else if containerState.status === 'error'}
							<span class="text-xs text-error">{containerState.error}</span>
						{:else}
							<span class="text-xs">Web Preview</span>
						{/if}
					</div>
					<span class="text-xs">{getStatusText()}</span>
				</div>
			{/if}
		{:else if activeTab === 'api'}
			<div class="flex flex-col items-center gap-3 text-muted">
				<div class="text-xs font-mono space-y-1">
					<div class="text-accent">GET /api/todos</div>
					<div class="text-warning">POST /api/todos</div>
					<div class="text-error">DEL /api/todos/:id</div>
				</div>
				<span class="text-xs">API Explorer (Sprint 1)</span>
			</div>
		{:else}
			<div class="flex flex-col items-center gap-3 text-muted">
				<div
					class="w-32 h-56 border-2 border-panel-border rounded-xl flex items-center justify-center"
				>
					<span class="text-xs">Mobile</span>
				</div>
				<span class="text-xs">Mobile Preview (Sprint 1)</span>
			</div>
		{/if}
	</div>
</div>
