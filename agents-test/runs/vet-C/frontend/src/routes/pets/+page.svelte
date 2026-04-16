<script lang="ts">
	import { onMount } from 'svelte';
	import { getPets, createPet, updatePet, deletePet, type Pet } from '$lib/api';

	let pets = $state<Pet[]>([]);
	let loading = $state(true);
	let error = $state('');
	let searchQuery = $state('');
	let showForm = $state(false);
	let editingPet = $state<Pet | null>(null);

	let formData = $state({
		name: '',
		species: 'dog',
		breed: '',
		age_years: 0,
		owner_name: '',
		owner_phone: '',
		notes: ''
	});

	onMount(() => loadPets());

	async function loadPets() {
		try {
			loading = true;
			error = '';
			pets = await getPets(searchQuery || undefined);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load pets';
		} finally {
			loading = false;
		}
	}

	function openForm(pet?: Pet) {
		if (pet) {
			editingPet = pet;
			formData = { ...pet };
		} else {
			editingPet = null;
			formData = {
				name: '',
				species: 'dog',
				breed: '',
				age_years: 0,
				owner_name: '',
				owner_phone: '',
				notes: ''
			};
		}
		showForm = true;
	}

	function closeForm() {
		showForm = false;
		editingPet = null;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		try {
			error = '';
			if (editingPet) {
				await updatePet(editingPet.id, formData);
			} else {
				await createPet(formData);
			}
			closeForm();
			await loadPets();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save pet';
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('Are you sure you want to delete this pet?')) return;
		try {
			error = '';
			await deletePet(id);
			await loadPets();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete pet';
		}
	}
</script>

<div class="container">
	<div class="header">
		<h1>Pets</h1>
		<button class="btn-primary" onclick={() => openForm()}>Add Pet</button>
	</div>

	<div class="search-bar">
		<input
			type="text"
			placeholder="Search by owner name..."
			bind:value={searchQuery}
			oninput={() => loadPets()}
		/>
	</div>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if loading}
		<p>Loading...</p>
	{:else if pets.length === 0}
		<p>No pets found. {searchQuery ? 'Try a different search.' : 'Add your first pet!'}</p>
	{:else}
		<div class="pets-grid">
			{#each pets as pet}
				<div class="pet-card">
					<div class="pet-header">
						<h3>{pet.name}</h3>
						<span class="pet-species">{pet.species}</span>
					</div>
					<div class="pet-info">
						{#if pet.breed}
							<p><strong>Breed:</strong> {pet.breed}</p>
						{/if}
						<p><strong>Age:</strong> {pet.age_years} years</p>
						<p><strong>Owner:</strong> {pet.owner_name}</p>
						<p><strong>Phone:</strong> {pet.owner_phone}</p>
						{#if pet.notes}
							<p class="pet-notes"><strong>Notes:</strong> {pet.notes}</p>
						{/if}
					</div>
					<div class="pet-actions">
						<button class="btn-secondary" onclick={() => openForm(pet)}>Edit</button>
						<button class="btn-danger" onclick={() => handleDelete(pet.id)}>Delete</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={closeForm}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>{editingPet ? 'Edit Pet' : 'Add Pet'}</h2>
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
					<input type="number" id="age" bind:value={formData.age_years} step="0.1" min="0" required />
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
					<button type="button" class="btn-secondary" onclick={closeForm}>Cancel</button>
					<button type="submit" class="btn-primary">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: bold;
		color: #1f2937;
	}

	.search-bar {
		margin-bottom: 2rem;
	}

	.search-bar input {
		width: 100%;
		max-width: 400px;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
	}

	.pets-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.pet-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.pet-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.pet-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.pet-species {
		background: #dbeafe;
		color: #1e40af;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.pet-info p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: #374151;
	}

	.pet-notes {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
		color: #6b7280;
	}

	.pet-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: auto;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal h2 {
		margin: 0 0 1.5rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.btn-danger {
		background: #ef4444;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-danger:hover {
		background: #dc2626;
	}

	.error {
		color: #dc2626;
		padding: 1rem;
		background: #fee2e2;
		border-radius: 6px;
		margin-bottom: 1rem;
	}
</style>
