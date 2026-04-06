<script lang="ts">
	import AddNoteForm from '$lib/components/AddNoteForm.svelte';
	import type { Note } from '../api/notes/types';

	function handleNoteCreated(note: Note) {
		console.log('Note created:', note);
		// You could show a toast notification here or redirect to notes list
		alert(`Note "${note.title}" created successfully!`);
	}
</script>

<svelte:head>
	<title>Add Note - P10</title>
	<meta name="description" content="Create a new note" />
</svelte:head>

<main class="min-h-screen bg-background">
	<div class="container mx-auto py-8">
		<div class="mb-8 text-center">
			<h1 class="text-4xl font-bold text-foreground mb-2">Add New Note</h1>
			<p class="text-muted-foreground">
				Create a new note with title and content
			</p>
		</div>
		
		<AddNoteForm onNoteCreated={handleNoteCreated} />
		
		<div class="mt-8 text-center">
			<a 
				href="/notes" 
				class="inline-flex items-center px-4 py-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
			>
				← Back to Notes
			</a>
		</div>
	</div>
</main>