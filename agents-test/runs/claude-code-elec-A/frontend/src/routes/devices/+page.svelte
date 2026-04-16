<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDevices, createDevice, updateDevice, deleteDevice, fetchConsumptionStats } from '$lib/api';
  import type { Device, ConsumptionStats } from '$lib/types';
  import DeviceCard from '$lib/components/DeviceCard.svelte';
  import Modal from '$lib/components/Modal.svelte';

  let loading = $state(true);
  let error = $state('');
  let devices: Device[] = $state([]);
  let stats: ConsumptionStats | null = $state(null);

  // Filters
  let filterType = $state('');
  let filterLocation = $state('');

  // Modal
  let showModal = $state(false);
  let editingDevice: Device | null = $state(null);
  let showDeleteConfirm = $state(false);
  let deletingDevice: Device | null = $state(null);

  // Form
  let formName = $state('');
  let formType = $state<Device['type']>('appliance');
  let formWattage = $state(0);
  let formLocation = $state('');
  let saving = $state(false);

  const deviceTypes: Device['type'][] = ['lighting', 'heating', 'cooling', 'appliance', 'electronics', 'other'];

  let filteredDevices = $derived(
    devices.filter(d => {
      if (filterType && d.type !== filterType) return false;
      if (filterLocation && !d.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
      return true;
    })
  );

  function getDeviceConsumption(deviceId: number): number | undefined {
    if (!stats) return undefined;
    const entry = stats.by_device.find(d => d.device_id === deviceId);
    return entry?.total_kwh;
  }

  function openAddModal() {
    editingDevice = null;
    formName = '';
    formType = 'appliance';
    formWattage = 0;
    formLocation = '';
    showModal = true;
  }

  function openEditModal(device: Device) {
    editingDevice = device;
    formName = device.name;
    formType = device.type;
    formWattage = device.wattage;
    formLocation = device.location;
    showModal = true;
  }

  function openDeleteConfirm(device: Device) {
    deletingDevice = device;
    showDeleteConfirm = true;
  }

  async function handleSubmit() {
    saving = true;
    error = '';
    try {
      if (editingDevice) {
        const updated = await updateDevice(editingDevice.id, {
          name: formName,
          type: formType,
          wattage: formWattage,
          location: formLocation
        });
        devices = devices.map(d => d.id === updated.id ? updated : d);
      } else {
        const created = await createDevice({
          name: formName,
          type: formType,
          wattage: formWattage,
          location: formLocation
        });
        devices = [...devices, created];
      }
      showModal = false;
    } catch (e: any) {
      error = e.message;
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!deletingDevice) return;
    try {
      await deleteDevice(deletingDevice.id);
      devices = devices.filter(d => d.id !== deletingDevice!.id);
      showDeleteConfirm = false;
      deletingDevice = null;
    } catch (e: any) {
      error = e.message;
    }
  }

  onMount(async () => {
    try {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [devResult, statsResult] = await Promise.allSettled([
        fetchDevices(),
        fetchConsumptionStats({ from: `${ym}-01`, to: `${ym}-31` })
      ]);
      if (devResult.status === 'fulfilled') devices = devResult.value;
      else error = 'Failed to load devices';
      if (statsResult.status === 'fulfilled') stats = statsResult.value;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Devices - ElecTrack</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1>Devices</h1>
    <button class="btn btn-primary" onclick={openAddModal}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add Device
    </button>
  </div>

  <!-- Filters -->
  <div class="filter-bar mb-3">
    <select bind:value={filterType}>
      <option value="">All Types</option>
      {#each deviceTypes as t}
        <option value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
      {/each}
    </select>
    <input
      type="text"
      placeholder="Search by location..."
      bind:value={filterLocation}
    />
  </div>

  {#if error}
    <div class="error-state mb-2">{error}</div>
  {/if}

  {#if loading}
    <div class="loading">Loading devices...</div>
  {:else if filteredDevices.length === 0}
    <div class="empty-state">
      {devices.length === 0 ? 'No devices yet. Add one!' : 'No devices match your filters.'}
    </div>
  {:else}
    <div class="grid-3">
      {#each filteredDevices as device (device.id)}
        <DeviceCard
          {device}
          onEdit={openEditModal}
          onDelete={openDeleteConfirm}
          consumption={getDeviceConsumption(device.id)}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Add/Edit Modal -->
<Modal open={showModal} title={editingDevice ? 'Edit Device' : 'Add Device'} onclose={() => showModal = false}>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="form-group">
      <label for="dev-name">Name</label>
      <input id="dev-name" type="text" bind:value={formName} required placeholder="e.g. Living Room Lamp" />
    </div>
    <div class="form-group">
      <label for="dev-type">Type</label>
      <select id="dev-type" bind:value={formType}>
        {#each deviceTypes as t}
          <option value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
        {/each}
      </select>
    </div>
    <div class="form-group">
      <label for="dev-wattage">Wattage (W)</label>
      <input id="dev-wattage" type="number" bind:value={formWattage} required min="0" step="1" />
    </div>
    <div class="form-group">
      <label for="dev-location">Location</label>
      <input id="dev-location" type="text" bind:value={formLocation} placeholder="e.g. Kitchen" />
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>Cancel</button>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {saving ? 'Saving...' : editingDevice ? 'Update' : 'Add Device'}
      </button>
    </div>
  </form>
</Modal>

<!-- Delete Confirmation -->
<Modal open={showDeleteConfirm} title="Delete Device" onclose={() => showDeleteConfirm = false}>
  <p class="confirm-text">
    Are you sure you want to delete <strong>{deletingDevice?.name}</strong>? This cannot be undone.
  </p>
  <div class="form-actions">
    <button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>Cancel</button>
    <button class="btn btn-danger" onclick={handleDelete}>Delete</button>
  </div>
</Modal>

<style>
  .filter-bar {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .filter-bar select,
  .filter-bar input {
    max-width: 220px;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }
  .confirm-text {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }
</style>
