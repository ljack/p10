<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';

	interface Project {
		id: string;
		name: string;
		description?: string;
		status: string;
		createdAt: string;
		updatedAt: string;
	}

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let showNewProject = $state(false);
	let newName = $state('');
	let newDescription = $state('');
	let creating = $state(false);

	onMount(async () => {
		if (!auth.isLoggedIn) {
			goto('/');
			return;
		}
		// Re-validate session: re-login to sync user ID with server
		// (handles master restarts that may have regenerated user IDs)
		try {
			await auth.login(auth.user!.username);
		} catch {
			// Server unreachable — proceed with cached user
		}
		loadProjects();
	});

	async function loadProjects() {
		loading = true;
		try {
			const resp = await fetch(`http://localhost:7777/projects?ownerId=${auth.user!.id}`);
			const data = await resp.json();
			projects = data.projects || [];
		} catch (err) {
			console.error('Failed to load projects:', err);
		} finally {
			loading = false;
		}
	}

	async function createProject() {
		if (!newName.trim()) return;
		creating = true;
		try {
			const resp = await fetch('http://localhost:7777/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newName.trim(),
					description: newDescription.trim() || undefined,
					ownerId: auth.user!.id,
				}),
			});
			const project = await resp.json();
			goto(`/projects/${project.id}`);
		} catch (err) {
			console.error('Failed to create project:', err);
		} finally {
			creating = false;
		}
	}

	function handleLogout() {
		auth.logout();
		goto('/');
	}

	function timeAgo(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && newName.trim()) createProject();
		if (e.key === 'Escape') showNewProject = false;
	}
</script>

<div class="h-screen bg-background text-foreground flex flex-col">
	<!-- Top Bar -->
	<div class="h-12 flex items-center justify-between px-6 border-b border-panel-border bg-panel-bg shrink-0">
		<div class="flex items-center gap-3">
			<span class="text-accent font-bold text-lg tracking-wider">P10</span>
			<span class="text-muted text-sm">Dashboard</span>
		</div>
		<div class="flex items-center gap-4">
			<span class="text-foreground text-sm">👤 {auth.user?.username}</span>
			<button
				onclick={handleLogout}
				class="text-muted hover:text-foreground text-sm transition-colors"
			>
				Logout
			</button>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto p-8">
		<div class="max-w-3xl mx-auto space-y-8">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-bold text-foreground">Your Projects</h2>
				<button
					onclick={() => (showNewProject = !showNewProject)}
					class="bg-accent text-background px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
				>
					+ New Project
				</button>
			</div>

			<!-- New Project Form -->
			{#if showNewProject}
				<div class="bg-panel-bg border border-accent rounded-lg p-5 space-y-4">
					<h3 class="text-foreground font-bold">Create New Project</h3>
					<input
						bind:value={newName}
						onkeydown={handleKeydown}
						placeholder="Project name (e.g., 'Todo App', 'Blog Platform')"
						disabled={creating}
						class="w-full bg-background border border-panel-border text-foreground px-4 py-2 rounded-lg outline-none focus:border-accent text-sm"
						autofocus
					/>
					<textarea
						bind:value={newDescription}
						placeholder="Description (optional)"
						disabled={creating}
						rows="2"
						class="w-full bg-background border border-panel-border text-foreground px-4 py-2 rounded-lg outline-none focus:border-accent text-sm resize-none"
					></textarea>
					<div class="flex gap-2">
						<button
							onclick={createProject}
							disabled={creating || !newName.trim()}
							class="bg-accent text-background px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50"
						>
							{creating ? 'Creating...' : 'Create & Open'}
						</button>
						<button
							onclick={() => (showNewProject = false)}
							class="text-muted hover:text-foreground text-sm px-4 py-2"
						>
							Cancel
						</button>
					</div>
				</div>
			{/if}

			<!-- Project List -->
			{#if loading}
				<div class="text-muted text-center py-12 animate-pulse">Loading projects...</div>
			{:else if projects.length === 0}
				<div class="text-center py-16 space-y-4">
					<div class="text-4xl">🚀</div>
					<p class="text-muted text-lg">No projects yet</p>
					<p class="text-muted text-sm">Create your first project to get started!</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each projects as project (project.id)}
						<a
							href="/projects/{project.id}"
							class="block bg-panel-bg border border-panel-border rounded-lg p-5 hover:border-accent transition-colors group"
						>
							<div class="flex items-center justify-between">
								<div class="space-y-1">
									<h3 class="text-foreground font-bold group-hover:text-accent transition-colors">
										{project.name}
									</h3>
									{#if project.description}
										<p class="text-muted text-sm">{project.description}</p>
									{/if}
								</div>
								<div class="text-right text-xs text-muted space-y-1">
									<div>Updated {timeAgo(project.updatedAt)}</div>
									<div>Created {new Date(project.createdAt).toLocaleDateString()}</div>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
