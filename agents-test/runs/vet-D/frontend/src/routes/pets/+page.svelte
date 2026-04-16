<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type Pet } from '$lib/api';
	
	let pets = $state<Pet[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let showForm = $state(false);
	let editingPet = $state<Pet | null>(null);
	
	let formData = $state({
		name: '',
		species: 'dog',
		breed: '',
		age_years: 1,
		owner_name: '',
		owner_phone: '',
		notes: ''
	});
	
	onMount(async () => {
		await loadPets();
	});
	
	async function loadPets() {
		loading = true;
		try {
			pets = await api.pets.getAll(searchQuery || undefined);
		} catch (error) {
			console.error('Failed to load pets:', error);
		} finally {
			loading = false;
		}
	}
	
	function openAddForm() {
		editingPet = null;
		formData = {
			name: '',
			species: 'dog',
			breed: '',
			age_years: 1,
			owner_name: '',
			owner_phone: '',
			notes: ''
		};
		showForm = true;
	}
	
	function openEditForm(pet: Pet) {
		editingPet = pet;
		formData = { ...pet };
		showForm = true;
	}
	
	async function handleSubmit(e: Event) {
		e.preventDefault();
		try {
			if (editingPet?.id) {
				await api.pets.update(editingPet.id, formData);
			} else {
				await api.pets.create(formData);
			}
			showForm = false;
			await loadPets();
		} catch (error) {
			console.error('Failed to save pet:', error);
			alert('Failed to save pet');
		}
	}
	
	async function handleDelete(id: number) {
		if (!confirm('Are you sure you want to delete this pet?')) return;
		
		try {
			await api.pets.delete(id);
			await loadPets();
		} catch (error) {
			console.error('Failed to delete pet:', error);
			alert('Failed to delete pet');
		}
	}
</script>

<svelte:head>
	<title>Pets - Vet Clinic</title>
</svelte:head>

<h1>Pets</h1>

<div class="controls">
	<input
		type="text"
		placeholder="Search by owner name..."
		bind:value={searchQuery}
		onkeyup={() => loadPets()}
	/>
	<button class="btn btn-primary" onclick={() => openAddForm()}>Add Pet</button>
</div>

{#if showForm}
	<div class="card">
		<h2>{editingPet ? 'Edit Pet' : 'Add New Pet'}</h2>
		<form onsubmit={handleSubmit}>
			<div class="form-group">
				<label for="name">Name *</label>
				<input type="text" id="name" bind:value={formData.name} required />
			</div>
			
			<div class="form-group">
				<label for="species">Species *</label>
				<select id="species" bind:value={formData.species} required>
					<option value="dog">Dog</option>
					<option value="cat">Cat</option>
					<option value="bird">Bird</option>
					<option value="rabbit">Rabbit</option>
					<option value="other">Other</option>
				</select>
			</div>
			
			<div class="form-group">
				<label for="breed">Breed</label>
				<input type="text" id="breed" bind:value={formData.breed} />
			</div>
			
			<div class="form-group">
				<label for="age">Age (years) *</label>
				<input type="number" id="age" step="0.1" min="0" bind:value={formData.age_years} required />
			</div>
			
			<div class="form-group">
				<label for="owner_name">Owner Name *</label>
				<input type="text" id="owner_name" bind:value={formData.owner_name} required />
			</div>
			
			<div class="form-group">
				<label for="owner_phone">Owner Phone *</label>
				<input type="tel" id="owner_phone" bind:value={formData.owner_phone} required />
			</div>
			
			<div class="form-group">
				<label for="notes">Notes</label>
				<textarea id="notes" bind:value={formData.notes} rows="3"></textarea>
			</div>
			
			<div class="form-actions">
				<button type="submit" class="btn btn-primary">Save</button>
				<button type="button" class="btn" onclick={() => showForm = false}>Cancel</button>
			</div>
		</form>
	</div>
{/if}

<div class="card">
	{#if loading}
		<p>Loading pets...</p>
	{:else if pets.length === 0}
		<p>No pets found. Add your first pet!</p>
	{:else}
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
						<td>{pet.species}</td>
						<td>{pet.breed || '-'}</td>
						<td>{pet.age_years} years</td>
						<td>{pet.owner_name}</td>
						<td>{pet.owner_phone}</td>
						<td>
							<button class="btn-small" onclick={() => openEditForm(pet)}>Edit</button>
							<button class="btn-small btn-danger" onclick={() => handleDelete(pet.id!)}>Delete</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	
	.controls input {
		flex: 1;
	}
	
	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}
	
	.btn-small {
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		background: #3498db;
		color: white;
		margin-right: 0.5rem;
	}
	
	.btn-small:hover {
		background: #2980b9;
	}
	
	.btn-small.btn-danger {
		background: #e74c3c;
	}
	
	.btn-small.btn-danger:hover {
		background: #c0392b;
	}
</style>
