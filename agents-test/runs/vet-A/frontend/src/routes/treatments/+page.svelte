<script lang="ts">
    import { onMount } from 'svelte';
    import { getTreatments, createTreatment, updateTreatment, deleteTreatment, type Treatment } from '$lib/api';
    
    let treatments: Treatment[] = $state([]);
    let loading = $state(true);
    let error = $state('');
    let showForm = $state(false);
    let editingTreatment: Treatment | null = $state(null);
    
    let formData = $state({
        name: '',
        duration_minutes: 30,
        description: '',
        price: '0.00'
    });
    
    onMount(async () => {
        await loadTreatments();
    });
    
    async function loadTreatments() {
        try {
            loading = true;
            treatments = await getTreatments();
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
    
    function resetForm() {
        formData = {
            name: '',
            duration_minutes: 30,
            description: '',
            price: '0.00'
        };
        editingTreatment = null;
        showForm = false;
    }
    
    function editTreatment(treatment: Treatment) {
        editingTreatment = treatment;
        formData = {
            name: treatment.name,
            duration_minutes: treatment.duration_minutes,
            description: treatment.description || '',
            price: treatment.price
        };
        showForm = true;
    }
    
    async function handleSubmit() {
        try {
            error = '';
            if (editingTreatment) {
                await updateTreatment(editingTreatment.id, formData);
            } else {
                await createTreatment(formData);
            }
            await loadTreatments();
            resetForm();
        } catch (e: any) {
            error = e.message;
        }
    }
    
    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this treatment?')) return;
        
        try {
            error = '';
            await deleteTreatment(id);
            await loadTreatments();
        } catch (e: any) {
            error = e.message;
        }
    }
</script>

<div>
    <h1>Treatments</h1>
    
    {#if error}
        <div class="error">{error}</div>
    {/if}
    
    <div class="card">
        <div class="actions-bar">
            <h2>Available Treatments</h2>
            <button class="btn btn-primary" onclick={() => showForm = !showForm}>
                {showForm ? 'Cancel' : 'Add Treatment'}
            </button>
        </div>
        
        {#if showForm}
            <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="treatment-form">
                <h3>{editingTreatment ? 'Edit Treatment' : 'Add New Treatment'}</h3>
                
                <div class="form-group">
                    <label for="name">Name *</label>
                    <input type="text" id="name" bind:value={formData.name} required />
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="duration">Duration (minutes) *</label>
                        <input type="number" id="duration" bind:value={formData.duration_minutes} min="5" step="5" required />
                    </div>
                    
                    <div class="form-group">
                        <label for="price">Price ($) *</label>
                        <input type="number" id="price" bind:value={formData.price} step="0.01" min="0" required />
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" bind:value={formData.description} rows="3"></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-success">
                        {editingTreatment ? 'Update' : 'Create'} Treatment
                    </button>
                    <button type="button" class="btn" onclick={resetForm}>Cancel</button>
                </div>
            </form>
        {/if}
    </div>
    
    <div class="card">
        {#if loading}
            <p>Loading...</p>
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
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each treatments as treatment}
                        <tr>
                            <td><strong>{treatment.name}</strong></td>
                            <td>{treatment.duration_minutes} min</td>
                            <td>${treatment.price}</td>
                            <td>{treatment.description || '-'}</td>
                            <td>
                                <button class="btn btn-sm" onclick={() => editTreatment(treatment)}>Edit</button>
                                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(treatment.id)}>Delete</button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>

<style>
    .actions-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .actions-bar h2 {
        margin: 0;
    }
    
    .treatment-form {
        border-top: 2px solid #ecf0f1;
        padding-top: 1.5rem;
        margin-top: 1rem;
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    
    .form-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
    }
    
    :global(.btn-sm) {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
        margin-right: 0.25rem;
    }
</style>
