<script lang="ts">
	import NotesList from '$lib/components/NotesList.svelte';
</script>

<svelte:head>
	<title>Notes List - P10</title>
	<meta name="description" content="Display notes from the API with delete functionality" />
</svelte:head>

<main class="min-h-screen bg-background">
	<div class="container mx-auto py-8">
		<div class="mb-8 text-center">
			<h1 class="text-4xl font-bold text-foreground mb-2">Notes List Component</h1>
			<p class="text-muted-foreground">
				Fetches notes from GET /api/notes and displays with delete functionality
			</p>
		</div>
		
		<NotesList />
	</div>
</main>