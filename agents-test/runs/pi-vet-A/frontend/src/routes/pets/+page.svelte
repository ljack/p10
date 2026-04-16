<script lang="ts">
	import { onMount } from 'svelte';
	import { getPets, createPet, updatePet, deletePet, type Pet } from '$lib/api';

	let pets = $state<Pet[]>([]);
	let search = $state('');
	let loading = $state(true);
	let showModal = $state(false);
	let editingPet = $state<Pet | null>(null);
	let error = $state('');

	let form = $state({
		name: '',
		species: 'dog' as string,
		breed: '',
		age_years: 1,
		owner_name: '',
		owner_phone: '',
		notes: ''
	});

	async function load() {
		loading = true;
		try {
			pets = await getPets(search || undefined);
		} catch (e: any) {
			console.error(e);
		}
		loading = false;
	}

	onMount(load);

	function openAdd() {
		editingPet = null;
		form = { name: '', species: 'dog', breed: '', age_years: 1, owner_name: '', owner_phone: '', notes: '' };
		error = '';
		showModal = true;
	}

	function openEdit(pet: Pet) {
		editingPet = pet;
		form = {
			name: pet.name,
			species: pet.species,
			breed: pet.breed || '',
			age_years: pet.age_years,
			owner_name: pet.owner_name,
			owner_phone: pet.owner_phone,
			notes: pet.notes || ''
		};
		error = '';
		showModal = true;
	}

	async function save() {
		error = '';
		try {
			const data = {
				...form,
				breed: form.breed || null,
				notes: form.notes || null
			};
			if (editingPet) {
				await updatePet(editingPet.id, data);
			} else {
				await createPet(data as any);
			}
			showModal = false;
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function remove(id: number) {
		if (!confirm('Delete this pet?')) return;
		try {
			await deletePet(id);
			await load();
		} catch (e: any) {
			alert(e.message);
		}
	}

	let debounceTimer: ReturnType<typeof setTimeout>;
	function onSearch() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(load, 300);
	}
</script>

<svelte:head><title>Pets – VetClinic</title></svelte:head>

<div class="toolbar">
	<h1>Pets</h1>
	<input type="text" placeholder="Search by owner name..." bind:value={search} oninput={onSearch} />
	<button class="btn btn-primary" onclick={openAdd}>+ Add Pet</button>
</div>

{#if loading}
	<p>Loading...</p>
{:else if pets.length === 0}
	<div class="card"><p style="color: var(--text-muted);">No pets found.</p></div>
{:else}
	<div class="card" style="padding: 0; overflow-x: auto;">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Species</th>
					<th>Breed</th>
					<th>Age</th>
					<th>Owner</th>
					<th>Phone</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each pets as pet}
					<tr>
						<td>{pet.name}</td>
						<td style="text-transform: capitalize;">{pet.species}</td>
						<td>{pet.breed || '—'}</td>
						<td>{pet.age_years}y</td>
						<td>{pet.owner_name}</td>
						<td>{pet.owner_phone}</td>
						<td>
							<button class="btn btn-secondary btn-sm" onclick={() => openEdit(pet)}>Edit</button>
							<button class="btn btn-danger btn-sm" onclick={() => remove(pet.id)}>Delete</button>
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
			<h2>{editingPet ? 'Edit Pet' : 'Add Pet'}</h2>

			<div class="form-group">
				<label for="pet-name">Name</label>
				<input id="pet-name" bind:value={form.name} required />
			</div>
			<div class="form-group">
				<label for="pet-species">Species</label>
				<select id="pet-species" bind:value={form.species}>
					<option value="dog">Dog</option>
					<option value="cat">Cat</option>
					<option value="bird">Bird</option>
					<option value="rabbit">Rabbit</option>
					<option value="other">Other</option>
				</select>
			</div>
			<div class="form-group">
				<label for="pet-breed">Breed</label>
				<input id="pet-breed" bind:value={form.breed} />
			</div>
			<div class="form-group">
				<label for="pet-age">Age (years)</label>
				<input id="pet-age" type="number" step="0.1" min="0" bind:value={form.age_years} />
			</div>
			<div class="form-group">
				<label for="pet-owner">Owner Name</label>
				<input id="pet-owner" bind:value={form.owner_name} required />
			</div>
			<div class="form-group">
				<label for="pet-phone">Owner Phone</label>
				<input id="pet-phone" bind:value={form.owner_phone} required />
			</div>
			<div class="form-group">
				<label for="pet-notes">Notes</label>
				<textarea id="pet-notes" bind:value={form.notes} rows="2"></textarea>
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
