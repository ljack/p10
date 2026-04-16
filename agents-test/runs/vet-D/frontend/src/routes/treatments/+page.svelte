<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type Treatment } from '$lib/api';
	
	let treatments = $state<Treatment[]>([]);
	let loading = $state(true);
	
	onMount(async () => {
		await loadTreatments();
	});
	
	async function loadTreatments() {
		loading = true;
		try {
			treatments = await api.treatments.getAll();
		} catch (error) {
			console.error('Failed to load treatments:', error);
		} finally {
			loading = false;
		}
	}
	
	function formatPrice(price: number): string {
		return `$${price.toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Treatments - Vet Clinic</title>
</svelte:head>

<h1>Treatments</h1>

<div class="card">
	{#if loading}
		<p>Loading treatments...</p>
	{:else if treatments.length === 0}
		<p>No treatments available.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Duration</th>
					<th>Price</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				{#each treatments as treatment}
					<tr>
						<td><strong>{treatment.name}</strong></td>
						<td>{treatment.duration_minutes} min</td>
						<td>{formatPrice(treatment.price)}</td>
						<td>{treatment.description || '-'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
