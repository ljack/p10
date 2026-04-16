<script lang="ts">
	import { onMount } from 'svelte';
	import AddTodo from './AddTodo.svelte';

	interface Todo {
		id: number;
		text: string;
		completed: boolean;
	}

	let todos = $state<Todo[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Fetch todos from the API
	async function fetchTodos() {
		loading = true;
		error = null;
		
		try {
			// Try Express server first (port 3001), fallback to SvelteKit API routes
			let response;
			try {
				response = await fetch('http://localhost:3001/api/todos');
			} catch {
				// Fallback to SvelteKit API routes if Express server unavailable
				response = await fetch('/api/todos');
			}
			
			if (!response.ok) {
				throw new Error(`Failed to fetch todos: ${response.status}`);
			}
			
			const result = await response.json();
			// Handle Express server response format { success: true, data: [...] }
			todos = result.data || result;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load todos';
			console.error('Error fetching todos:', err);
		} finally {
			loading = false;
		}
	}

	// Toggle todo completion status
	async function toggleTodo(todo: Todo) {
		const originalCompleted = todo.completed;
		
		// Optimistically update UI
		todo.completed = !todo.completed;
		
		try {
			// Try Express server first, fallback to SvelteKit API routes
			let response;
			try {
				response = await fetch(`http://localhost:3001/api/todos/${todo.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						text: todo.text,
						completed: todo.completed
					})
				});
			} catch {
				// Fallback to SvelteKit API routes
				response = await fetch(`/api/todos/${todo.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						text: todo.text,
						completed: todo.completed
					})
				});
			}
			
			if (!response.ok) {
				throw new Error(`Failed to update todo: ${response.status}`);
			}
			
			// Update with server response
			const result = await response.json();
			const updatedTodo = result.data || result;
			const todoIndex = todos.findIndex(t => t.id === todo.id);
			if (todoIndex !== -1) {
				todos[todoIndex] = updatedTodo;
			}
		} catch (err) {
			// Revert optimistic update on error
			todo.completed = originalCompleted;
			error = err instanceof Error ? err.message : 'Failed to update todo';
			console.error('Error updating todo:', err);
			
			// Clear error after 3 seconds
			setTimeout(() => error = null, 3000);
		}
	}

	// Handle new todo added
	function onTodoAdded(event: CustomEvent<Todo>) {
		// Add the new todo to the list optimistically
		todos = [...todos, event.detail];
		
		// Optionally refresh the entire list to ensure sync
		// fetchTodos();
	}

	// Load todos when component mounts
	onMount(() => {
		fetchTodos();
	});
</script>

<div class="w-full max-w-2xl mx-auto space-y-6">
	<!-- Add Todo Form -->
	<AddTodo on:todoAdded={onTodoAdded} />

	<!-- Todo List -->
	<div class="bg-surface rounded-lg shadow-lg border border-border overflow-hidden">
		<!-- Header -->
		<div class="bg-surface-alt px-6 py-4 border-b border-border">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold text-foreground">Todo List</h2>
				<button 
					onclick={fetchTodos}
					disabled={loading}
					class="px-3 py-1 text-sm bg-accent/20 text-accent rounded hover:bg-accent/30 
						   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Loading...' : 'Refresh'}
				</button>
			</div>
			
			{#if error}
				<div class="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
					{error}
				</div>
			{/if}
		</div>

		<!-- Todo List -->
		<div class="divide-y divide-border">
			{#if loading && todos.length === 0}
				<div class="p-8 text-center text-muted">
					<div class="inline-block animate-spin w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full mb-3"></div>
					<p>Loading todos...</p>
				</div>
			{:else if todos.length === 0}
				<div class="p-8 text-center text-muted">
					<p class="text-lg mb-2">No todos yet</p>
					<p class="text-sm">Your todo list is empty.</p>
				</div>
			{:else}
				{#each todos as todo (todo.id)}
					<div class="p-4 hover:bg-surface-alt/50 transition-colors">
						<div class="flex items-center gap-4">
							<!-- Toggle Button -->
							<button
								onclick={() => toggleTodo(todo)}
								class="flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all duration-200
									   {todo.completed 
										? 'bg-accent border-accent text-white' 
										: 'border-muted hover:border-accent'}"
								aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
							>
								{#if todo.completed}
									<svg class="w-4 h-4 mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
									</svg>
								{/if}
							</button>
							
							<!-- Todo Text -->
							<div class="flex-1">
								<p class="text-foreground transition-all duration-200 {todo.completed ? 'line-through text-muted' : ''}">
									{todo.text}
								</p>
							</div>
							
							<!-- Status Badge -->
							<div class="flex-shrink-0">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
											 {todo.completed 
											   ? 'bg-green-500/10 text-green-400' 
											   : 'bg-yellow-500/10 text-yellow-400'}">
									{todo.completed ? 'Completed' : 'Pending'}
								</span>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer Stats -->
		{#if todos.length > 0}
			<div class="bg-surface-alt px-6 py-3 border-t border-border">
				<div class="flex items-center justify-between text-sm text-muted">
					<span>
						{todos.filter(t => t.completed).length} of {todos.length} completed
					</span>
					<span>
						{todos.filter(t => !t.completed).length} remaining
					</span>
				</div>
			</div>
		{/if}
	</div>
</div>