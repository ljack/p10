<script lang="ts">
	import NotesList from '$lib/components/NotesList.svelte';
	import AddNoteForm from '$lib/components/AddNoteForm.svelte';
	import type { Note } from '../api/notes/types';

	let notesListComponent: NotesList;

	async function handleNoteCreated(note: Note) {
		// Refresh the notes list when a new note is created
		if (notesListComponent) {
			await notesListComponent.refresh();
		}
	}

	async function createSampleNotes() {
		const sampleNotes = [
			{
				title: "Meeting Notes",
				content: "Discussed project roadmap and upcoming milestones. Next meeting scheduled for Friday."
			},
			{
				title: "Shopping List",
				content: "• Milk\n• Bread\n• Eggs\n• Coffee\n• Apples"
			},
			{
				title: "Book Ideas",
				content: "Ideas for my next novel:\n1. Time travel mystery\n2. AI detective story\n3. Space exploration adventure"
			}
		];

		for (const noteData of sampleNotes) {
			try {
				await fetch('/api/notes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(noteData)
				});
			} catch (err) {
				console.error('Failed to create sample note:', err);
			}
		}

		// Refresh the list
		if (notesListComponent) {
			await notesListComponent.refresh();
		}
	}

	async function clearAllNotes() {
		const confirmed = confirm('Are you sure you want to delete ALL notes?\n\nThis action cannot be undone.');
		if (!confirmed) return;

		try {
			// Get all notes first
			const response = await fetch('/api/notes');
			const data = await response.json();
			const notes = data.notes;

			// Delete each note
			for (const note of notes) {
				await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
			}

			// Refresh the list
			if (notesListComponent) {
				await notesListComponent.refresh();
			}
		} catch (err) {
			console.error('Failed to clear notes:', err);
			alert('Failed to clear all notes. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>Delete Functionality Demo - P10</title>
	<meta name="description" content="Demonstrate notes delete functionality" />
</svelte:head>

<main class="min-h-screen bg-background">
	<div class="container mx-auto py-8">
		<div class="mb-8 text-center">
			<h1 class="text-4xl font-bold text-foreground mb-2">Delete Functionality Demo</h1>
			<p class="text-muted-foreground mb-6">
				Test the complete CRUD functionality: Create, Read, and Delete notes
			</p>
			
			<div class="flex justify-center gap-4 mb-8">
				<button
					onclick={createSampleNotes}
					class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
				>
					📝 Add Sample Notes
				</button>
				<button
					onclick={clearAllNotes}
					class="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
				>
					🗑️ Clear All Notes
				</button>
			</div>
		</div>

		<div class="grid lg:grid-cols-3 gap-8">
			<!-- Create Section -->
			<section class="lg:col-span-1">
				<div class="sticky top-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">
						➕ Create New Note
					</h2>
					<AddNoteForm onNoteCreated={handleNoteCreated} />
				</div>
			</section>

			<!-- Notes List Section -->
			<section class="lg:col-span-2">
				<h2 class="text-2xl font-semibold text-foreground mb-4">
					📋 Your Notes
					<span class="text-sm text-muted-foreground font-normal ml-2">
						(Click trash icon to delete)
					</span>
				</h2>
				<NotesList bind:this={notesListComponent} showHeader={false} />
			</section>
		</div>
		
		<!-- Instructions -->
		<div class="mt-16 bg-blue-50 border border-blue-200 rounded-lg p-6">
			<h3 class="text-lg font-semibold text-blue-900 mb-3">🧪 How to Test Delete Functionality</h3>
			<div class="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
				<div>
					<h4 class="font-medium mb-2">✅ Delete Features to Test:</h4>
					<ul class="space-y-1 ml-4">
						<li>• <strong>Confirmation dialog</strong> - Requires user confirmation</li>
						<li>• <strong>Loading state</strong> - Shows spinner during deletion</li>
						<li>• <strong>Success feedback</strong> - Green success message</li>
						<li>• <strong>Auto-refresh</strong> - List updates immediately</li>
						<li>• <strong>Error handling</strong> - Try deleting same note twice</li>
					</ul>
				</div>
				<div>
					<h4 class="font-medium mb-2">🔄 API Endpoints Used:</h4>
					<ul class="space-y-1 ml-4">
						<li>• <code>GET /api/notes</code> - Fetch notes list</li>
						<li>• <code>POST /api/notes</code> - Create new note</li>
						<li>• <code>DELETE /api/notes/:id</code> - Delete specific note</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</main>