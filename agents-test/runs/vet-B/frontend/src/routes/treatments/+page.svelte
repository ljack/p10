<script lang="ts">
  import { onMount } from 'svelte';
  
  let treatments = $state([]);
  let showForm = $state(false);
  let editingId = $state(null);
  
  let form = $state({
    name: '',
    duration_minutes: 30,
    description: '',
    price: 0
  });
  
  onMount(loadTreatments);
  
  async function loadTreatments() {
    const res = await fetch('/api/treatments');
    treatments = await res.json();
  }
  
  async function saveTreatment() {
    const url = editingId ? `/api/treatments/${editingId}` : '/api/treatments';
    const method = editingId ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    
    resetForm();
    loadTreatments();
  }
  
  async function deleteTreatment(id: number) {
    if (confirm('Delete this treatment?')) {
      await fetch(`/api/treatments/${id}`, { method: 'DELETE' });
      loadTreatments();
    }
  }
  
  function editTreatment(treatment: any) {
    form = { ...treatment };
    editingId = treatment.id;
    showForm = true;
  }
  
  function resetForm() {
    form = {
      name: '',
      duration_minutes: 30,
      description: '',
      price: 0
    };
    editingId = null;
    showForm = false;
  }
</script>

<h1>Treatments</h1>

<div class="card">
  <button class="btn btn-primary" onclick={() => showForm = !showForm}>
    {showForm ? 'Cancel' : 'Add Treatment'}
  </button>
  
  {#if showForm}
    <div style="margin-top: 1rem;">
      <div class="form-group">
        <label>Name</label>
        <input type="text" bind:value={form.name} />
      </div>
      
      <div class="form-group">
        <label>Duration (minutes)</label>
        <input type="number" bind:value={form.duration_minutes} />
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea bind:value={form.description}></textarea>
      </div>
      
      <div class="form-group">
        <label>Price ($)</label>
        <input type="number" step="0.01" bind:value={form.price} />
      </div>
      
      <button class="btn btn-success" onclick={saveTreatment}>Save</button>
      <button class="btn" onclick={resetForm}>Cancel</button>
    </div>
  {/if}
</div>

<div class="card">
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
          <td>{treatment.name}</td>
          <td>{treatment.duration_minutes} min</td>
          <td>${treatment.price}</td>
          <td>{treatment.description || '-'}</td>
          <td>
            <button class="btn btn-primary" onclick={() => editTreatment(treatment)}>Edit</button>
            <button class="btn btn-danger" onclick={() => deleteTreatment(treatment.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
