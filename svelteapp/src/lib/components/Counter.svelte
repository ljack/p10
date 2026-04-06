<script lang="ts">
	import { onMount } from 'svelte';

	let count = $state<number | null>(null);
	let loading = $state(false);

	onMount(async () => {
		const res = await fetch('/api/counter');
		const data = await res.json();
		count = data.count;
	});

	async function increment() {
		loading = true;
		try {
			const res = await fetch('/api/counter/increment', { method: 'POST' });
			const data = await res.json();
			count = data.count;
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col items-center justify-center gap-6 py-12">
	<div class="text-7xl font-bold tabular-nums text-foreground">
		{count ?? '…'}
	</div>
	<button
		onclick={increment}
		disabled={loading || count === null}
		class="px-6 py-3 rounded-lg bg-accent text-white font-semibold text-lg
		       hover:brightness-110 active:scale-95 transition-all
		       disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{loading ? 'Incrementing…' : 'Increment'}
	</button>
</div>
