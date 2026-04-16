<script lang="ts">
	import { onMount } from 'svelte';
	import { getTreatments, createTreatment, updateTreatment, deleteTreatment, type Treatment } from '$lib/api';

	let treatments = $state<Treatment[]>([]);
	let loading = $state(true);
	let showModal = $state(false);
	let editing = $state<Treatment | null>(null);
	let error = $state('');

	let form = $state({
		name: '',
		duration_minutes: 30,
		description: '',
		price: 0
	});

	async function load() {
		loading = true;
		try {
			treatments = await getTreatments();
		} catch (e: any) {
			console.error(e);
		}
		loading = false;
	}

	onMount(load);

	function openAdd() {
		editing = null;
		form = { name: '', duration_minutes: 30, description: '', price: 0 };
		error = '';
		showModal = true;
	}

	function openEdit(t: Treatment) {
		editing = t;
		form = {
			name: t.name,
			duration_minutes: t.duration_minutes,
			description: t.description || '',
			price: t.price
		};
		error = '';
		showModal = true;
	}

	async function save() {
		error = '';
		try {
			const data = {
				...form,
				description: form.description || null
			};
			if (editing) {
				await updateTreatment(editing.id, data);
			} else {
				await createTreatment(data as any);
			}
			showModal = false;
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function remove(id: number) {
		if (!confirm('Delete this treatment?')) return;
		try {
			await deleteTreatment(id);
			await load();
		} catch (e: any) {
			alert(e.message);
		}
	}
</script>

<svelte:head><title>Treatments – VetClinic</title></svelte:head>

<div class="toolbar">
	<h1>Treatments</h1>
	<button class="btn btn-primary" onclick={openAdd}>+ Add Treatment</button>
</div>

{#if loading}
	<p>Loading...</p>
{:else if treatments.length === 0}
	<div class="card"><p style="color: var(--text-muted);">No treatments found.</p></div>
{:else}
	<div class="card" style="padding: 0; overflow-x: auto;">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Duration</th>
					<th>Price</th>
					<th>Description</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each treatments as t}
					<tr>
						<td>{t.name}</td>
						<td>{t.duration_minutes} min</td>
						<td>${t.price.toFixed(2)}</td>
						<td>{t.description || '—'}</td>
						<td>
							<button class="btn btn-secondary btn-sm" onclick={() => openEdit(t)}>Edit</button>
							<button class="btn btn-danger btn-sm" onclick={() => remove(t.id)}>Delete</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if showModal}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => showModal = false} onkeydown={(e) => { if (e.key === 'Escape') showModal = false; }}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<h2>{editing ? 'Edit Treatment' : 'Add Treatment'}</h2>

			<div class="form-group">
				<label for="t-name">Name</label>
				<input id="t-name" bind:value={form.name} required />
			</div>
			<div class="form-group">
				<label for="t-duration">Duration (minutes)</label>
				<input id="t-duration" type="number" min="1" bind:value={form.duration_minutes} />
			</div>
			<div class="form-group">
				<label for="t-price">Price ($)</label>
				<input id="t-price" type="number" step="0.01" min="0" bind:value={form.price} />
			</div>
			<div class="form-group">
				<label for="t-desc">Description</label>
				<textarea id="t-desc" bind:value={form.description} rows="2"></textarea>
			</div>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={() => showModal = false}>Cancel</button>
				<button class="btn btn-primary" onclick={save}>Save</button>
			</div>
		</div>
	</div>
{/if}
