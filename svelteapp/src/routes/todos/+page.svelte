<script lang="ts">
	import TodoList from '$lib/components/TodoList.svelte';
</script>

<svelte:head>
	<title>Todo List</title>
</svelte:head>

<div class="min-h-screen bg-background p-4">
	<div class="max-w-4xl mx-auto">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-foreground mb-2">Todo Manager</h1>
			<p class="text-muted">
				Manage your tasks with the Express API backend
			</p>
		</div>
		
		<TodoList />
		
		<div class="mt-8 text-center">
			<p class="text-muted text-sm">
				Connected to Express server: <code class="bg-surface-alt px-1 rounded">http://localhost:3001/api/todos</code>
			</p>
			<p class="text-muted text-xs mt-1">
				Falls back to SvelteKit API routes if Express server unavailable
			</p>
		</div>
	</div>
</div>