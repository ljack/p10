<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { pipelineStore } from '$lib/stores/pipelines.svelte';

	let { children } = $props();

	// Update page title with activity indicator
	onMount(() => {
		$effect(() => {
			const hasActive = pipelineStore.hasActive;
			const baseTitle = 'P10 — AI Development Platform';
			document.title = hasActive ? '🚀 ' + baseTitle : baseTitle;
		});
	});
</script>

<svelte:head>
	<title>P10 — AI Development Platform</title>
	<meta name="description" content="Spec it by day, ship it by night." />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
</svelte:head>

{@render children()}
