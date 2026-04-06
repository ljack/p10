<script lang="ts">
	import type { CreateNoteRequest, CreateNoteResponse } from '../../routes/api/notes/types';

	interface Props {
		onNoteCreated?: (note: any) => void;
	}

	let { onNoteCreated }: Props = $props();

	let title = $state('');
	let content = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		// Reset states
		error = null;
		success = false;
		loading = true;

		try {
			const requestData: CreateNoteRequest = {
				title: title.trim(),
				content: content.trim()
			};

			const response = await fetch('/api/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestData)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
				throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
			}

			const result: CreateNoteResponse = await response.json();
			
			// Success - reset form and show success message
			title = '';
			content = '';
			success = true;
			
			// Call callback to refresh notes list
			if (onNoteCreated) {
				onNoteCreated(result.note);
			}

			// Hide success message after 3 seconds
			setTimeout(() => {
				success = false;
			}, 3000);

		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create note';
			console.error('Error creating note:', err);
		} finally {
			loading = false;
		}
	}

	function handleTitleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		title = target.value;
	}

	function handleContentInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		content = target.value;
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Handle Ctrl+Enter or Cmd+Enter to submit
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault();
			if (!loading && title.trim()) {
				handleSubmit(new Event('submit'));
			}
		}
	}
</script>

<div class="w-full max-w-2xl mx-auto">
	<div class="bg-card border border-border rounded-lg p-6 shadow-sm">
		<h3 class="text-xl font-semibold text-foreground mb-6">Add New Note</h3>
		
		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Title Input -->
			<div>
				<label for="title" class="block text-sm font-medium text-foreground mb-2">
					Title <span class="text-red-500">*</span>
				</label>
				<input
					id="title"
					type="text"
					value={title}
					oninput={handleTitleInput}
					placeholder="Enter note title..."
					maxlength="255"
					required
					disabled={loading}
					class="w-full px-3 py-2 border border-border rounded-md 
					       bg-background text-foreground placeholder:text-muted-foreground
					       focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
					       disabled:opacity-50 disabled:cursor-not-allowed"
				/>
				<div class="mt-1 text-xs text-muted-foreground">
					{title.length}/255 characters
				</div>
			</div>

			<!-- Content Input -->
			<div>
				<label for="content" class="block text-sm font-medium text-foreground mb-2">
					Content
				</label>
				<textarea
					id="content"
					value={content}
					oninput={handleContentInput}
					onkeydown={handleKeyDown}
					placeholder="Write your note content here..."
					rows="6"
					maxlength="10000"
					disabled={loading}
					class="w-full px-3 py-2 border border-border rounded-md 
					       bg-background text-foreground placeholder:text-muted-foreground
					       focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
					       disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
				></textarea>
				<div class="mt-1 text-xs text-muted-foreground">
					{content.length}/10,000 characters • Press Ctrl+Enter to submit
				</div>
			</div>

			<!-- Error Message -->
			{#if error}
				<div class="bg-red-50 border border-red-200 rounded-md p-4">
					<div class="flex items-center">
						<svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
						</svg>
						<span class="text-red-800 text-sm">{error}</span>
					</div>
				</div>
			{/if}

			<!-- Success Message -->
			{#if success}
				<div class="bg-green-50 border border-green-200 rounded-md p-4">
					<div class="flex items-center">
						<svg class="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
						</svg>
						<span class="text-green-800 text-sm">Note created successfully!</span>
					</div>
				</div>
			{/if}

			<!-- Submit Button -->
			<div class="flex justify-end">
				<button
					type="submit"
					disabled={loading || !title.trim()}
					class="px-6 py-2 bg-accent text-white font-medium rounded-md
					       hover:brightness-110 active:scale-95 transition-all
					       disabled:opacity-50 disabled:cursor-not-allowed
					       focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
				>
					{loading ? 'Creating...' : 'Create Note'}
				</button>
			</div>
		</form>
	</div>
</div>