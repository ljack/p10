<script lang="ts">
	import NotesList from './NotesList.svelte';
</script>

<div class="min-h-screen bg-background">
	<div class="container mx-auto py-8">
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-foreground mb-2">Notes Example</h1>
			<p class="text-muted-foreground">
				This demonstrates the NotesList component that fetches and displays notes from GET /api/notes
			</p>
		</div>
		
		<NotesList showHeader={true} />
	</div>
</div>