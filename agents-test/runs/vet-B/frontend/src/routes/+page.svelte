<script lang="ts">
  import { onMount } from 'svelte';
  
  let appointments = $state([]);
  let stats = $state({ total: 0, today: 0, scheduled: 0, completed: 0 });
  let loading = $state(true);
  
  onMount(async () => {
    const res = await fetch('/api/appointments');
    const data = await res.json();
    appointments = data;
    
    const today = new Date().toISOString().split('T')[0];
    stats.total = data.length;
    stats.today = data.filter(a => a.scheduled_at.startsWith(today)).length;
    stats.scheduled = data.filter(a => a.status === 'scheduled').length;
    stats.completed = data.filter(a => a.status === 'completed').length;
    
    loading = false;
  });
  
  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString();
  }
</script>

<h1>Dashboard</h1>

{#if loading}
  <p>Loading...</p>
{:else}
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">{stats.today}</div>
      <div class="stat-label">Today's Appointments</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.scheduled}</div>
      <div class="stat-label">Scheduled</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.completed}</div>
      <div class="stat-label">Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.total}</div>
      <div class="stat-label">Total Appointments</div>
    </div>
  </div>

  <div class="card">
    <h2>Today's Appointments</h2>
    {#if appointments.filter(a => a.scheduled_at.startsWith(new Date().toISOString().split('T')[0])).length === 0}
      <p>No appointments today</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Pet</th>
            <th>Owner</th>
            <th>Treatment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each appointments.filter(a => a.scheduled_at.startsWith(new Date().toISOString().split('T')[0])) as appt}
            <tr>
              <td>{formatDateTime(appt.scheduled_at)}</td>
              <td>{appt.pet.name}</td>
              <td>{appt.pet.owner_name}</td>
              <td>{appt.treatment.name}</td>
              <td><span class="status-badge status-{appt.status}">{appt.status}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
{/if}
