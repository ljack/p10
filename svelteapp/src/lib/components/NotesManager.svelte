<script lang="ts">
	import AddNoteForm from './AddNoteForm.svelte';
	import NotesList from './NotesList.svelte';
	import type { Note } from '../../routes/api/notes/types';

	let notesListComponent: NotesList;

	async function handleNoteCreated(newNote: Note) {
		// Refresh the notes list when a new note is created
		if (notesListComponent) {
			await notesListComponent.refresh();
		}
	}
</script>

<div class="w-full max-w-6xl mx-auto p-6 space-y-12">
	<div>
		<h1 class="text-4xl font-bold text-foreground mb-2">Notes</h1>
		<p class="text-muted-foreground">Create and manage your notes</p>
	</div>

	<!-- Add Note Form -->
	<section>
		<AddNoteForm onNoteCreated={handleNoteCreated} />
	</section>

	<!-- Notes List -->
	<section>
		<div class="border-t border-border pt-8">
			<h2 class="text-2xl font-semibold text-foreground mb-6">Your Notes</h2>
			<NotesList bind:this={notesListComponent} showHeader={false} />
		</div>
	</section>
</div>