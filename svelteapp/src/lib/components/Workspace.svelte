<script lang="ts">
	import TopBar from './TopBar.svelte';
	import ChatPanel from './ChatPanel.svelte';
	import PreviewPanel from './PreviewPanel.svelte';
	import AgentStatus from './AgentStatus.svelte';
	import BottomBar from './BottomBar.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { debugBus } from '$lib/debug/debugBus.svelte';
	import { browserDaemon } from '$lib/daemon/browserDaemon.svelte';
	import { startSpecSync } from '$lib/specs/specLoader';
	import { activeProject } from '$lib/stores/project.svelte';

	let { projectId, projectName }: { projectId: string; projectName?: string } = $props();

	let splitPos = $state(40); // percentage
	let dragging = $state(false);

	function onMouseDown() {
		dragging = true;
	}

	function onMouseMove(e: MouseEvent) {
		if (!dragging) return;
		const container = e.currentTarget as HTMLElement;
		const rect = container.getBoundingClientRect();
		const pct = ((e.clientX - rect.left) / rect.width) * 100;
		splitPos = Math.min(90, Math.max(10, pct));
	}

	function onMouseUp() {
		dragging = false;
	}

	// Start browser daemon + push state snapshots + spec sync
	onMount(() => {
		// Set active project context
		activeProject.setProject({ id: projectId, name: projectName || projectId });
		debugBus.log('event', 'app', `P10 workspace mounted for project ${projectId}`);
		browserDaemon.start();
		startSpecSync();
		const interval = setInterval(async () => {
			try {
				const snapshot = debugBus.getSnapshot();
				await fetch('/api/debug', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(snapshot)
				});
			} catch { /* ignore */ }
		}, 5000);
		// Keyboard shortcuts
		const handleKeyboard = (e: KeyboardEvent) => {
			// Cmd/Ctrl+K: Focus chat input
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				const textarea = document.querySelector('.bg-panel-bg textarea') as HTMLTextAreaElement;
				textarea?.focus();
			}
			// Cmd/Ctrl+Shift+P: Toggle preview panel width
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
				e.preventDefault();
				splitPos = splitPos > 50 ? 30 : 70;
			}
		};
		window.addEventListener('keydown', handleKeyboard);

		return () => {
			clearInterval(interval);
			window.removeEventListener('keydown', handleKeyboard);
			activeProject.clear();
		};
	});
</script>

<div class="h-full flex flex-col bg-background text-foreground">
	<TopBar {projectId} {projectName} />

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="flex-1 min-h-0 flex"
		onmousemove={onMouseMove}
		onmouseup={onMouseUp}
		onmouseleave={onMouseUp}
	>
		<!-- Chat Panel -->
		<div style="width: {splitPos}%" class="min-w-0">
			<ChatPanel />
		</div>

		<!-- Resize Handle -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-1 cursor-col-resize shrink-0 transition-colors {dragging ? 'bg-accent' : 'bg-panel-border hover:bg-accent'}"
			onmousedown={onMouseDown}
		></div>

		<!-- Preview + Agent Status -->
		<div style="width: {100 - splitPos}%" class="min-w-0 flex flex-col">
			<div class="flex-1 min-h-0">
				<PreviewPanel />
			</div>
			<AgentStatus />
		</div>
	</div>

	<BottomBar />
</div>

<style>
	:global(body) {
		cursor: default;
	}
</style>
