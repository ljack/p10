<script lang="ts">
	let { projectId }: { projectId: string } = $props();
</script>

<div class="h-10 flex items-center justify-between px-4 border-b border-panel-border bg-panel-bg shrink-0">
	<div class="flex items-center gap-3">
		<span class="text-accent font-bold text-sm tracking-wider">P10</span>
		<span class="text-muted text-xs">—</span>
		<span class="text-foreground text-sm">{projectId}</span>
	</div>

	<div class="flex items-center gap-4">
		<button class="text-muted hover:text-foreground text-xs transition-colors">⚙️ Settings</button>
	</div>
</div>
