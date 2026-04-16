<script lang="ts">
    import { onMount } from 'svelte';
    import { getPets, createPet, updatePet, deletePet, type Pet } from '$lib/api';
    
    let pets: Pet[] = $state([]);
    let loading = $state(true);
    let error = $state('');
    let searchQuery = $state('');
    let showForm = $state(false);
    let editingPet: Pet | null = $state(null);
    
    let formData = $state({
        name: '',
        species: 'dog',
        breed: '',
        age_years: 0,
        owner_name: '',
        owner_phone: '',
        notes: ''
    });
    
    onMount(async () => {
        await loadPets();
    });
    
    async function loadPets() {
        try {
            loading = true;
            pets = await getPets(searchQuery || undefined);
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
    
    function resetForm() {
        formData = {
            name: '',
            species: 'dog',
            breed: '',
            age_years: 0,
            owner_name: '',
            owner_phone: '',
            notes: ''
        };
        editingPet = null;
        showForm = false;
    }
    
    function editPet(pet: Pet) {
        editingPet = pet;
        formData = {
            name: pet.name,
            species: pet.species,
            breed: pet.breed || '',
            age_years: pet.age_years,
            owner_name: pet.owner_name,
            owner_phone: pet.owner_phone,
            notes: pet.notes || ''
        };
        showForm = true;
    }
    
    async function handleSubmit() {
        try {
            error = '';
            if (editingPet) {
                await updatePet(editingPet.id, formData);
            } else {
                await createPet(formData);
            }
            await loadPets();
            resetForm();
        } catch (e: any) {
            error = e.message;
        }
    }
    
    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this pet?')) return;
        
        try {
            error = '';
            await deletePet(id);
            await loadPets();
        } catch (e: any) {
            error = e.message;
        }
    }
</script>

<div>
    <h1>Pets</h1>
    
    {#if error}
        <div class="error">{error}</div>
    {/if}
    
    <div class="card">
        <div class="actions-bar">
            <input 
                type="text" 
                placeholder="Search by owner name..." 
                bind:value={searchQuery}
                onkeyup={loadPets}
                style="max-width: 300px"
            />
            <button class="btn btn-primary" onclick={() => showForm = !showForm}>
                {showForm ? 'Cancel' : 'Add Pet'}
            </button>
        </div>
        
        {#if showForm}
            <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="pet-form">
                <h3>{editingPet ? 'Edit Pet' : 'Add New Pet'}</h3>
                
                <div class="form-row">
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
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="breed">Breed</label>
                        <input type="text" id="breed" bind:value={formData.breed} />
                    </div>
                    
                    <div class="form-group">
                        <label for="age">Age (years) *</label>
                        <input type="number" id="age" bind:value={formData.age_years} step="0.5" required />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="owner">Owner Name *</label>
                        <input type="text" id="owner" bind:value={formData.owner_name} required />
                    </div>
                    
                    <div class="form-group">
                        <label for="phone">Owner Phone *</label>
                        <input type="tel" id="phone" bind:value={formData.owner_phone} required />
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="notes">Notes</label>
                    <textarea id="notes" bind:value={formData.notes} rows="3"></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-success">
                        {editingPet ? 'Update' : 'Create'} Pet
                    </button>
                    <button type="button" class="btn" onclick={resetForm}>Cancel</button>
                </div>
            </form>
        {/if}
    </div>
    
    <div class="card">
        <h2>All Pets</h2>
        {#if loading}
            <p>Loading...</p>
        {:else if pets.length === 0}
            <p>No pets found.</p>
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
                            <td>{pet.age_years} yrs</td>
                            <td>{pet.owner_name}</td>
                            <td>{pet.owner_phone}</td>
                            <td>
                                <button class="btn btn-sm" onclick={() => editPet(pet)}>Edit</button>
                                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(pet.id)}>Delete</button>
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
    
    .pet-form {
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
