<script lang="ts">
	import { onMount } from 'svelte';
	import { getTreatments, createTreatment, updateTreatment, deleteTreatment, type Treatment } from '$lib/api';

	let treatments = $state<Treatment[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showForm = $state(false);
	let editingTreatment = $state<Treatment | null>(null);

	let formData = $state({
		name: '',
		duration_minutes: 30,
		description: '',
		price: 0
	});

	onMount(() => loadTreatments());

	async function loadTreatments() {
		try {
			loading = true;
			error = '';
			treatments = await getTreatments();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load treatments';
		} finally {
			loading = false;
		}
	}

	function openForm(treatment?: Treatment) {
		if (treatment) {
			editingTreatment = treatment;
			formData = { ...treatment, price: Number(treatment.price) };
		} else {
			editingTreatment = null;
			formData = {
				name: '',
				duration_minutes: 30,
				description: '',
				price: 0
			};
		}
		showForm = true;
	}

	function closeForm() {
		showForm = false;
		editingTreatment = null;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		try {
			error = '';
			if (editingTreatment) {
				await updateTreatment(editingTreatment.id, formData);
			} else {
				await createTreatment(formData);
			}
			closeForm();
			await loadTreatments();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save treatment';
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('Are you sure you want to delete this treatment?')) return;
		try {
			error = '';
			await deleteTreatment(id);
			await loadTreatments();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete treatment';
		}
	}
</script>

<div class="container">
	<div class="header">
		<h1>Treatments</h1>
		<button class="btn-primary" onclick={() => openForm()}>Add Treatment</button>
	</div>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if loading}
		<p>Loading...</p>
	{:else if treatments.length === 0}
		<p>No treatments found. Add your first treatment!</p>
	{:else}
		<div class="treatments-grid">
			{#each treatments as treatment}
				<div class="treatment-card">
					<div class="treatment-header">
						<h3>{treatment.name}</h3>
						<span class="treatment-price">${Number(treatment.price).toFixed(2)}</span>
					</div>
					<div class="treatment-info">
						<p><strong>Duration:</strong> {treatment.duration_minutes} minutes</p>
						{#if treatment.description}
							<p class="treatment-description">{treatment.description}</p>
						{/if}
					</div>
					<div class="treatment-actions">
						<button class="btn-secondary" onclick={() => openForm(treatment)}>Edit</button>
						<button class="btn-danger" onclick={() => handleDelete(treatment.id)}>Delete</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={closeForm}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>{editingTreatment ? 'Edit Treatment' : 'Add Treatment'}</h2>
			<form onsubmit={handleSubmit}>
				<div class="form-group">
					<label for="name">Name *</label>
					<input type="text" id="name" bind:value={formData.name} required />
				</div>

				<div class="form-group">
					<label for="duration">Duration (minutes) *</label>
					<input type="number" id="duration" bind:value={formData.duration_minutes} min="1" step="5" required />
				</div>

				<div class="form-group">
					<label for="price">Price *</label>
					<input type="number" id="price" bind:value={formData.price} min="0" step="0.01" required />
				</div>

				<div class="form-group">
					<label for="description">Description</label>
					<textarea id="description" bind:value={formData.description} rows="3"></textarea>
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

	.treatments-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.treatment-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.treatment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.treatment-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.treatment-price {
		background: #dcfce7;
		color: #166534;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.treatment-info p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: #374151;
	}

	.treatment-description {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
		color: #6b7280;
	}

	.treatment-actions {
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
