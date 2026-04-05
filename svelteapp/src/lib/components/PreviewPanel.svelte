<script lang="ts">
	type PreviewTab = 'web' | 'api' | 'mobile';

	let activeTab = $state<PreviewTab>('web');

	const tabs: { id: PreviewTab; label: string }[] = [
		{ id: 'web', label: 'Web' },
		{ id: 'api', label: 'API' },
		{ id: 'mobile', label: 'Mobile' }
	];
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

		<button
			class="text-muted hover:text-foreground text-xs px-1 transition-colors"
			title="Refresh">↻</button
		>
		<button class="text-muted hover:text-foreground text-xs px-1 transition-colors" title="Pause"
			>⏸</button
		>
	</div>

	<!-- Preview content -->
	<div class="flex-1 min-h-0 flex items-center justify-center">
		{#if activeTab === 'web'}
			<div class="flex flex-col items-center gap-3 text-muted">
				<div
					class="w-64 h-40 border border-panel-border rounded flex items-center justify-center"
				>
					<span class="text-xs">Web Preview</span>
				</div>
				<span class="text-xs">WebContainer not started yet (Sprint 1-2)</span>
			</div>
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
