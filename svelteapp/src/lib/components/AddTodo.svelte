<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Todo {
		id: number;
		text: string;
		completed: boolean;
	}

	const dispatch = createEventDispatcher<{
		todoAdded: Todo;
	}>();

	let newTodoText = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function addTodo() {
		const text = newTodoText.trim();
		
		if (!text) {
			error = 'Please enter a todo text';
			return;
		}

		if (text.length > 500) {
			error = 'Todo text cannot exceed 500 characters';
			return;
		}

		loading = true;
		error = null;

		try {
			// Try Express server first, fallback to SvelteKit API routes
			let response;
			try {
				response = await fetch('http://localhost:3001/api/todos', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						text: text,
						completed: false
					})
				});
			} catch {
				// Fallback to SvelteKit API routes
				response = await fetch('/api/todos', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						text: text,
						completed: false
					})
				});
			}

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to create todo: ${response.status}`);
			}

			const result = await response.json();
			const newTodo = result.data || result;

			// Clear form
			newTodoText = '';
			
			// Dispatch event to parent component
			dispatch('todoAdded', newTodo);

		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add todo';
			console.error('Error adding todo:', err);
		} finally {
			loading = false;
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		addTodo();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			addTodo();
		}
		// Clear error when user starts typing
		if (error && event.key !== 'Enter') {
			error = null;
		}
	}
</script>

<form onsubmit={handleSubmit} class="w-full">
	<div class="bg-surface rounded-lg shadow-lg border border-border overflow-hidden">
		<!-- Header -->
		<div class="bg-surface-alt px-6 py-4 border-b border-border">
			<h3 class="text-lg font-semibold text-foreground">Add New Todo</h3>
			{#if error}
				<div class="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
					{error}
				</div>
			{/if}
		</div>

		<!-- Form Content -->
		<div class="p-6">
			<div class="flex gap-4">
				<!-- Text Input -->
				<div class="flex-1">
					<input
						bind:value={newTodoText}
						onkeydown={handleKeydown}
						placeholder="What needs to be done?"
						disabled={loading}
						class="w-full px-4 py-3 bg-surface border border-border rounded-lg 
						       text-foreground placeholder-muted
						       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
						       disabled:opacity-50 disabled:cursor-not-allowed
						       transition-colors"
						maxlength="500"
						autocomplete="off"
					/>
					<div class="flex justify-between items-center mt-2 text-xs text-muted">
						<span>Press Enter to add</span>
						<span class:text-red-400={newTodoText.length > 450}>
							{newTodoText.length}/500
						</span>
					</div>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={loading || !newTodoText.trim()}
					class="px-6 py-3 bg-accent text-white rounded-lg font-medium
					       hover:brightness-110 active:scale-95 
					       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100
					       transition-all duration-200 flex-shrink-0"
				>
					{#if loading}
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
							Adding...
						</div>
					{:else}
						Add Todo
					{/if}
				</button>
			</div>
		</div>
	</div>
</form>