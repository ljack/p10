<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDevices, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } from '$lib/api';
  import type { Device, Schedule } from '$lib/types';
  import ScheduleGrid from '$lib/components/ScheduleGrid.svelte';
  import Modal from '$lib/components/Modal.svelte';

  let loading = $state(true);
  let error = $state('');
  let devices: Device[] = $state([]);
  let schedules: Schedule[] = $state([]);

  // Modal
  let showModal = $state(false);
  let editingSchedule: Schedule | null = $state(null);
  let showDeleteConfirm = $state(false);
  let deletingSchedule: Schedule | null = $state(null);

  // Form
  let formDeviceId = $state(0);
  let formDayOfWeek = $state(0);
  let formStartTime = $state('08:00');
  let formEndTime = $state('09:00');
  let formEnabled = $state(true);
  let saving = $state(false);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function openAddModal() {
    editingSchedule = null;
    formDeviceId = devices.length > 0 ? devices[0].id : 0;
    formDayOfWeek = 0;
    formStartTime = '08:00';
    formEndTime = '09:00';
    formEnabled = true;
    showModal = true;
  }

  function openEditModal(schedule: Schedule) {
    editingSchedule = schedule;
    formDeviceId = schedule.device_id;
    formDayOfWeek = schedule.day_of_week;
    formStartTime = schedule.start_time.slice(0, 5);
    formEndTime = schedule.end_time.slice(0, 5);
    formEnabled = schedule.enabled;
    showModal = true;
  }

  function openDeleteConfirm(schedule: Schedule) {
    deletingSchedule = schedule;
    showDeleteConfirm = true;
  }

  async function handleToggle(schedule: Schedule) {
    try {
      const updated = await updateSchedule(schedule.id, { enabled: !schedule.enabled });
      schedules = schedules.map(s => s.id === updated.id ? updated : s);
    } catch (e: any) {
      error = e.message;
    }
  }

  async function handleSubmit() {
    if (!formDeviceId) {
      error = 'Please select a device';
      return;
    }
    saving = true;
    error = '';
    try {
      if (editingSchedule) {
        const updated = await updateSchedule(editingSchedule.id, {
          device_id: formDeviceId,
          day_of_week: formDayOfWeek,
          start_time: formStartTime,
          end_time: formEndTime,
          enabled: formEnabled
        });
        schedules = schedules.map(s => s.id === updated.id ? updated : s);
      } else {
        const created = await createSchedule({
          device_id: formDeviceId,
          day_of_week: formDayOfWeek,
          start_time: formStartTime,
          end_time: formEndTime,
          enabled: formEnabled
        });
        schedules = [...schedules, created];
      }
      showModal = false;
    } catch (e: any) {
      error = e.message;
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!deletingSchedule) return;
    try {
      await deleteSchedule(deletingSchedule.id);
      schedules = schedules.filter(s => s.id !== deletingSchedule!.id);
      showDeleteConfirm = false;
      deletingSchedule = null;
    } catch (e: any) {
      error = e.message;
    }
  }

  onMount(async () => {
    try {
      const [devs, scheds] = await Promise.all([
        fetchDevices(),
        fetchSchedules()
      ]);
      devices = devs;
      schedules = scheds;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Schedules - ElecTrack</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1>Schedules</h1>
    <button class="btn btn-primary" onclick={openAddModal}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add Schedule
    </button>
  </div>

  {#if error}
    <div class="error-state mb-2">{error}</div>
  {/if}

  {#if loading}
    <div class="loading">Loading schedules...</div>
  {:else if schedules.length === 0}
    <div class="empty-state">
      No schedules yet. Create one to automate your devices!
    </div>
  {:else}
    <ScheduleGrid
      {schedules}
      onToggle={handleToggle}
      onEdit={openEditModal}
      onDelete={openDeleteConfirm}
    />
  {/if}
</div>

<!-- Add/Edit Modal -->
<Modal open={showModal} title={editingSchedule ? 'Edit Schedule' : 'Add Schedule'} onclose={() => showModal = false}>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="form-group">
      <label for="sched-device">Device</label>
      <select id="sched-device" bind:value={formDeviceId}>
        <option value={0} disabled>Select device...</option>
        {#each devices as d}
          <option value={d.id}>{d.name} ({d.wattage}W)</option>
        {/each}
      </select>
    </div>
    <div class="form-group">
      <label for="sched-day">Day of Week</label>
      <select id="sched-day" bind:value={formDayOfWeek}>
        {#each dayNames as day, i}
          <option value={i}>{day}</option>
        {/each}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="sched-start">Start Time</label>
        <input id="sched-start" type="time" bind:value={formStartTime} />
      </div>
      <div class="form-group">
        <label for="sched-end">End Time</label>
        <input id="sched-end" type="time" bind:value={formEndTime} />
      </div>
    </div>
    <div class="form-group">
      <div class="toggle-row">
        <label class="toggle">
          <input type="checkbox" bind:checked={formEnabled} />
          <span class="slider"></span>
        </label>
        <span class="toggle-label">Enabled</span>
      </div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>Cancel</button>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {saving ? 'Saving...' : editingSchedule ? 'Update' : 'Add Schedule'}
      </button>
    </div>
  </form>
</Modal>

<!-- Delete Confirmation -->
<Modal open={showDeleteConfirm} title="Delete Schedule" onclose={() => showDeleteConfirm = false}>
  <p class="confirm-text">
    Are you sure you want to delete this schedule for <strong>{deletingSchedule?.device_name ?? `Device #${deletingSchedule?.device_id}`}</strong>?
  </p>
  <div class="form-actions">
    <button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>Cancel</button>
    <button class="btn btn-danger" onclick={handleDelete}>Delete</button>
  </div>
</Modal>

<style>
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .toggle-label {
    font-size: 0.875rem;
    color: var(--text);
  }
  .confirm-text {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }
</style>
