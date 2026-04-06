<script lang="ts">
	import AddNoteForm from '$lib/components/AddNoteForm.svelte';
	import NotesList from '$lib/components/NotesList.svelte';
	import type { Note } from '../api/notes/types';

	let notesListComponent: NotesList;
	let successMessage = $state<string | null>(null);

	async function handleNoteCreated(note: Note) {
		console.log('Note created:', note);
		
		// Show success message
		successMessage = `Note "${note.title}" created successfully!`;
		
		// Hide message after 3 seconds
		setTimeout(() => {
			successMessage = null;
		}, 3000);
		
		// Refresh the notes list
		if (notesListComponent) {
			await notesListComponent.refresh();
		}
	}
</script>

<svelte:head>
	<title>Notes Demo - P10</title>
	<meta name="description" content="Demo of AddNoteForm integration with NotesList" />
</svelte:head>

<main class="min-h-screen bg-background">
	<div class="container mx-auto py-8">
		<div class="mb-8 text-center">
			<h1 class="text-4xl font-bold text-foreground mb-2">Notes Demo</h1>
			<p class="text-muted-foreground">
				AddNoteForm component with automatic notes list refresh
			</p>
		</div>

		<!-- Success notification -->
		{#if successMessage}
			<div class="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg">
				{successMessage}
			</div>
		{/if}
		
		<div class="grid lg:grid-cols-2 gap-8">
			<!-- Add Note Form -->
			<section>
				<h2 class="text-2xl font-semibold text-foreground mb-4">Create Note</h2>
				<AddNoteForm onNoteCreated={handleNoteCreated} />
			</section>

			<!-- Notes List -->
			<section>
				<h2 class="text-2xl font-semibold text-foreground mb-4">Your Notes</h2>
				<NotesList bind:this={notesListComponent} showHeader={false} />
			</section>
		</div>
		
		<div class="mt-12 text-center">
			<div class="inline-flex gap-4 text-sm text-muted-foreground">
				<span>💡 Use Ctrl+Enter to submit the form</span>
				<span>•</span>
				<span>📝 Notes auto-refresh after creation</span>
				<span>•</span>
				<span>🗑️ Click trash icon to delete</span>
			</div>
		</div>
	</div>
</main>