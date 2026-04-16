<script lang="ts">
  import { onMount } from 'svelte';
  
  let pets = $state([]);
  let showForm = $state(false);
  let editingId = $state(null);
  let searchQuery = $state('');
  
  let form = $state({
    name: '',
    species: 'dog',
    breed: '',
    age_years: 0,
    owner_name: '',
    owner_phone: '',
    notes: ''
  });
  
  onMount(loadPets);
  
  async function loadPets() {
    const res = await fetch('/api/pets' + (searchQuery ? `?owner_name=${searchQuery}` : ''));
    pets = await res.json();
  }
  
  async function savePet() {
    const url = editingId ? `/api/pets/${editingId}` : '/api/pets';
    const method = editingId ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    
    resetForm();
    loadPets();
  }
  
  async function deletePet(id: number) {
    if (confirm('Delete this pet?')) {
      await fetch(`/api/pets/${id}`, { method: 'DELETE' });
      loadPets();
    }
  }
  
  function editPet(pet: any) {
    form = { ...pet };
    editingId = pet.id;
    showForm = true;
  }
  
  function resetForm() {
    form = {
      name: '',
      species: 'dog',
      breed: '',
      age_years: 0,
      owner_name: '',
      owner_phone: '',
      notes: ''
    };
    editingId = null;
    showForm = false;
  }
</script>

<h1>Pets</h1>

<div class="card">
  <input type="text" placeholder="Search by owner name..." bind:value={searchQuery} oninput={loadPets} />
  
  <button class="btn btn-primary" onclick={() => showForm = !showForm}>
    {showForm ? 'Cancel' : 'Add Pet'}
  </button>
  
  {#if showForm}
    <div style="margin-top: 1rem;">
      <div class="form-group">
        <label>Name</label>
        <input type="text" bind:value={form.name} />
      </div>
      
      <div class="form-group">
        <label>Species</label>
        <select bind:value={form.species}>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
          <option value="bird">Bird</option>
          <option value="rabbit">Rabbit</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Breed</label>
        <input type="text" bind:value={form.breed} />
      </div>
      
      <div class="form-group">
        <label>Age (years)</label>
        <input type="number" step="0.1" bind:value={form.age_years} />
      </div>
      
      <div class="form-group">
        <label>Owner Name</label>
        <input type="text" bind:value={form.owner_name} />
      </div>
      
      <div class="form-group">
        <label>Owner Phone</label>
        <input type="text" bind:value={form.owner_phone} />
      </div>
      
      <div class="form-group">
        <label>Notes</label>
        <textarea bind:value={form.notes}></textarea>
      </div>
      
      <button class="btn btn-success" onclick={savePet}>Save</button>
      <button class="btn" onclick={resetForm}>Cancel</button>
    </div>
  {/if}
</div>

<div class="card">
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
          <td>{pet.age_years}</td>
          <td>{pet.owner_name}</td>
          <td>{pet.owner_phone}</td>
          <td>
            <button class="btn btn-primary" onclick={() => editPet(pet)}>Edit</button>
            <button class="btn btn-danger" onclick={() => deletePet(pet.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
