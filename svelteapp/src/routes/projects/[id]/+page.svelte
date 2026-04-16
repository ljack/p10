<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '$lib/stores/auth.svelte';
	import Workspace from '$lib/components/Workspace.svelte';

	interface Project {
		id: string;
		name: string;
		description?: string;
		status: string;
	}

	let project = $state<Project | null>(null);
	let error = $state('');
	let loading = $state(true);

	onMount(() => {
		if (!auth.isLoggedIn) {
			goto('/');
			return;
		}
		loadProject();
	});

	async function loadProject() {
		const projectId = page.params.id;
		try {
			const resp = await fetch(`http://localhost:7777/projects/${projectId}`);
			if (!resp.ok) {
				error = 'Project not found';
				return;
			}
			project = await resp.json();
		} catch (err) {
			error = 'Failed to load project';
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<div class="h-screen bg-background flex items-center justify-center">
		<div class="text-muted animate-pulse">Loading project...</div>
	</div>
{:else if error}
	<div class="h-screen bg-background flex items-center justify-center">
		<div class="text-center space-y-4">
			<div class="text-red-400 text-lg">{error}</div>
			<a href="/dashboard" class="text-accent hover:underline">← Back to Dashboard</a>
		</div>
	</div>
{:else if project}
	<div class="h-screen flex flex-col">
		<Workspace projectId={project.id} projectName={project.name} />
	</div>
{/if}
