<script lang="ts">
	import Calculator from '$lib/components/Calculator.svelte';
</script>

<svelte:head>
	<title>Calculator</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
	<div class="text-center">
		<h1 class="text-2xl font-bold text-foreground mb-6">Calculator</h1>
		<Calculator />
		<p class="text-muted text-sm mt-4">
			Powered by <code class="bg-surface-alt px-1 rounded">/api/calculate</code>
		</p>
	</div>
</div>
