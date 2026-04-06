<script lang="ts">
	import { onMount } from 'svelte';
	import type { Note, GetNotesResponse, DeleteNoteResponse } from '../../routes/api/notes/types';

	interface Props {
		showHeader?: boolean;
	}

	let { showHeader = true }: Props = $props();

	let notes = $state<Note[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingNoteId = $state<string | null>(null);
	let deleteSuccess = $state<string | null>(null);

	async function fetchNotes() {
		try {
			loading = true;
			error = null;
			
			const response = await fetch('/api/notes');
			
			if (!response.ok) {
				throw new Error(`Failed to fetch notes: ${response.status} ${response.statusText}`);
			}
			
			const data: GetNotesResponse = await response.json();
			notes = data.notes;
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
			console.error('Error fetching notes:', err);
		} finally {
			loading = false;
		}
	}

	// Public method to refresh notes from parent components
	export function refresh() {
		return fetchNotes();
	}

	onMount(() => {
		fetchNotes();
	});

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function deleteNote(noteId: string, noteTitle: string) {
		// Confirm deletion
		const confirmed = confirm(`Are you sure you want to delete "${noteTitle}"?\n\nThis action cannot be undone.`);
		if (!confirmed) {
			return;
		}

		try {
			deletingNoteId = noteId;
			
			const response = await fetch(`/api/notes/${noteId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
				throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
			}

			// Success - show success message and refresh the notes list
			deleteSuccess = `Note "${noteTitle}" deleted successfully`;
			await fetchNotes();
			
			// Hide success message after 3 seconds
			setTimeout(() => {
				deleteSuccess = null;
			}, 3000);
			
		} catch (err) {
			console.error('Error deleting note:', err);
			// Show error in a more user-friendly way
			alert(`Failed to delete note: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			deletingNoteId = null;
		}
	}
</script>

<div class="w-full max-w-4xl mx-auto p-6">
	{#if showHeader}
		<h2 class="text-3xl font-bold text-foreground mb-8">Notes</h2>
	{/if}
	
	<!-- Delete Success Message -->
	{#if deleteSuccess}
		<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
			<div class="flex items-center">
				<svg class="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
				</svg>
				<span class="text-green-800 font-medium">{deleteSuccess}</span>
			</div>
		</div>
	{/if}
	
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-lg text-muted-foreground">Loading notes...</div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<div class="flex items-center">
				<svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
				</svg>
				<span class="text-red-800 font-medium">Error loading notes</span>
			</div>
			<p class="text-red-600 mt-1">{error}</p>
		</div>
	{:else if notes.length === 0}
		<div class="text-center py-12">
			<svg class="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
			</svg>
			<h3 class="text-xl font-medium text-foreground mb-2">No notes found</h3>
			<p class="text-muted-foreground">Create your first note to get started.</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each notes as note (note.id)}
				<article class="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
					<header class="mb-4">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h3 class="text-xl font-semibold text-foreground mb-2">{note.title}</h3>
								<div class="text-sm text-muted-foreground space-y-1">
									<div class="flex items-center">
										<span class="font-medium mr-2">Created:</span>
										<time datetime={note.createdAt.toString()}>
											{formatDate(note.createdAt)}
										</time>
									</div>
									<div class="flex items-center">
										<span class="font-medium mr-2">Updated:</span>
										<time datetime={note.updatedAt.toString()}>
											{formatDate(note.updatedAt)}
										</time>
									</div>
								</div>
							</div>
							<button
								onclick={() => deleteNote(note.id, note.title)}
								disabled={deletingNoteId === note.id}
								class="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors
								       disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
								title="Delete note"
							>
								{#if deletingNoteId === note.id}
									<!-- Loading spinner -->
									<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
								{:else}
									<!-- Trash icon -->
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
									</svg>
								{/if}
							</button>
						</div>
					</header>
					
					<div class="prose prose-sm max-w-none">
						<div class="text-foreground whitespace-pre-wrap leading-relaxed">
							{note.content}
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>