<script lang="ts">
  import { onMount } from 'svelte';
  
  let appointments = $state([]);
  let filterDate = $state('');
  let filterStatus = $state('');
  
  onMount(loadAppointments);
  
  async function loadAppointments() {
    let url = '/api/appointments?';
    if (filterDate) url += `date=${filterDate}&`;
    if (filterStatus) url += `status=${filterStatus}&`;
    
    const res = await fetch(url);
    appointments = await res.json();
  }
  
  async function updateStatus(id: number, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadAppointments();
  }
  
  async function deleteAppointment(id: number) {
    if (confirm('Delete this appointment?')) {
      await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      loadAppointments();
    }
  }
  
  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString();
  }
</script>

<h1>Appointments</h1>

<div class="card">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
    <div>
      <label>Filter by Date</label>
      <input type="date" bind:value={filterDate} oninput={loadAppointments} />
    </div>
    
    <div>
      <label>Filter by Status</label>
      <select bind:value={filterStatus} onchange={loadAppointments}>
        <option value="">All</option>
        <option value="scheduled">Scheduled</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  </div>
</div>

<div class="card">
  <table>
    <thead>
      <tr>
        <th>Time</th>
        <th>Pet</th>
        <th>Owner</th>
        <th>Treatment</th>
        <th>Duration</th>
        <th>Price</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each appointments as appt}
        <tr>
          <td>{formatDateTime(appt.scheduled_at)}</td>
          <td>{appt.pet.name} ({appt.pet.species})</td>
          <td>{appt.pet.owner_name}<br/>{appt.pet.owner_phone}</td>
          <td>{appt.treatment.name}</td>
          <td>{appt.treatment.duration_minutes} min</td>
          <td>${appt.treatment.price}</td>
          <td>
            <select bind:value={appt.status} onchange={() => updateStatus(appt.id, appt.status)}>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </td>
          <td>
            <button class="btn btn-danger" onclick={() => deleteAppointment(appt.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
