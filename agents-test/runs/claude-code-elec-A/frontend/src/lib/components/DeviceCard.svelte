<script lang="ts">
  import type { Device } from '$lib/types';

  let { device, onEdit, onDelete, consumption }: {
    device: Device;
    onEdit: (d: Device) => void;
    onDelete: (d: Device) => void;
    consumption?: number;
  } = $props();

  const typeIcons: Record<string, string> = {
    lighting: '💡',
    heating: '🔥',
    cooling: '❄️',
    appliance: '🔌',
    electronics: '💻',
    other: '📦'
  };
</script>

<div class="card device-card">
  <div class="device-header">
    <span class="device-icon">{typeIcons[device.type] ?? '📦'}</span>
    <span class="badge badge-{device.type}">{device.type}</span>
  </div>

  <h3 class="device-name">{device.name}</h3>

  <div class="device-details">
    <div class="detail">
      <span class="detail-label">Wattage</span>
      <span class="detail-value">{device.wattage}W</span>
    </div>
    <div class="detail">
      <span class="detail-label">Location</span>
      <span class="detail-value">{device.location || '--'}</span>
    </div>
    {#if consumption != null}
      <div class="detail">
        <span class="detail-label">This Month</span>
        <span class="detail-value">{consumption.toFixed(2)} kWh</span>
      </div>
    {/if}
  </div>

  <div class="device-actions">
    <button class="btn-icon" onclick={() => onEdit(device)} title="Edit">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
    <button class="btn-icon" onclick={() => onDelete(device)} title="Delete">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .device-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .device-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .device-icon {
    font-size: 1.5rem;
  }
  .device-name {
    font-size: 1.05rem;
    font-weight: 600;
  }
  .device-details {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .detail {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
  }
  .detail-label {
    color: var(--text-muted);
  }
  .detail-value {
    font-weight: 500;
  }
  .device-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
  }
</style>
