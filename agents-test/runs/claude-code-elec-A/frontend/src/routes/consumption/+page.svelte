<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDevices, logConsumption, fetchConsumption, fetchConsumptionStats } from '$lib/api';
  import type { Device, ConsumptionLog } from '$lib/types';
  import ConsumptionChart from '$lib/components/ConsumptionChart.svelte';

  let loading = $state(true);
  let error = $state('');
  let devices: Device[] = $state([]);
  let logs: ConsumptionLog[] = $state([]);

  // Log form
  let logDeviceId = $state(0);
  let logStartedAt = $state('');
  let logDuration = $state(30);
  let logSaving = $state(false);
  let logSuccess = $state('');

  // Filters
  let filterDeviceId = $state(0);
  let filterFrom = $state('');
  let filterTo = $state('');

  // Price (we'll use a reasonable default)
  let pricePerKwh = $state(0.15);

  let filteredLogs = $derived(
    logs.filter(l => {
      if (filterDeviceId && l.device_id !== filterDeviceId) return false;
      if (filterFrom && l.started_at < filterFrom) return false;
      if (filterTo && l.started_at > filterTo + 'T23:59:59') return false;
      return true;
    }).sort((a, b) => b.started_at.localeCompare(a.started_at))
  );

  // Aggregate daily kWh for chart
  let dailyData = $derived(() => {
    const byDay: Record<string, number> = {};
    for (const log of filteredLogs) {
      const day = log.started_at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + log.kwh;
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        label: date.slice(5), // MM-DD
        value
      }));
  });

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch {
      return iso;
    }
  }

  function formatDuration(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function getDeviceName(id: number): string {
    return devices.find(d => d.id === id)?.name ?? `Device #${id}`;
  }

  async function handleLogSubmit() {
    if (!logDeviceId) {
      error = 'Please select a device';
      return;
    }
    logSaving = true;
    error = '';
    logSuccess = '';
    try {
      const created = await logConsumption({
        device_id: logDeviceId,
        started_at: logStartedAt || new Date().toISOString(),
        duration_minutes: logDuration
      });
      logs = [created, ...logs];
      logSuccess = `Logged ${created.kwh.toFixed(2)} kWh`;
      logStartedAt = '';
      logDuration = 30;
    } catch (e: any) {
      error = e.message;
    } finally {
      logSaving = false;
    }
  }

  async function loadData() {
    loading = true;
    error = '';
    try {
      const [devs, consumptions] = await Promise.all([
        fetchDevices(),
        fetchConsumption({ from: filterFrom || undefined, to: filterTo || undefined })
      ]);
      devices = devs;
      logs = consumptions;
      if (devs.length > 0 && !logDeviceId) {
        logDeviceId = devs[0].id;
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    // Reload when date filters change
    if (filterFrom || filterTo) {
      loadData();
    }
  });

  onMount(() => {
    // Set default date range to current month
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    filterFrom = `${ym}-01`;
    filterTo = now.toISOString().slice(0, 10);

    // Set default started_at for log form
    logStartedAt = now.toISOString().slice(0, 16);

    loadData();
  });
</script>

<svelte:head>
  <title>Consumption - ElecTrack</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1>Consumption</h1>
  </div>

  {#if error}
    <div class="error-state mb-2">{error}</div>
  {/if}
  {#if logSuccess}
    <div class="success-banner mb-2">{logSuccess}</div>
  {/if}

  <!-- Log Form -->
  <div class="card mb-3">
    <h3 class="mb-2">Log Consumption</h3>
    <form class="log-form" onsubmit={(e) => { e.preventDefault(); handleLogSubmit(); }}>
      <div class="form-group">
        <label for="log-device">Device</label>
        <select id="log-device" bind:value={logDeviceId}>
          <option value={0} disabled>Select device...</option>
          {#each devices as d}
            <option value={d.id}>{d.name} ({d.wattage}W)</option>
          {/each}
        </select>
      </div>
      <div class="form-group">
        <label for="log-start">Started At</label>
        <input id="log-start" type="datetime-local" bind:value={logStartedAt} />
      </div>
      <div class="form-group">
        <label for="log-duration">Duration (minutes)</label>
        <input id="log-duration" type="number" bind:value={logDuration} min="1" step="1" />
      </div>
      <div class="form-group form-submit">
        <button type="submit" class="btn btn-primary" disabled={logSaving}>
          {logSaving ? 'Logging...' : 'Log Consumption'}
        </button>
      </div>
    </form>
  </div>

  <!-- Filters -->
  <div class="filter-bar mb-2">
    <div class="form-group">
      <label for="f-device">Device</label>
      <select id="f-device" bind:value={filterDeviceId}>
        <option value={0}>All Devices</option>
        {#each devices as d}
          <option value={d.id}>{d.name}</option>
        {/each}
      </select>
    </div>
    <div class="form-group">
      <label for="f-from">From</label>
      <input id="f-from" type="date" bind:value={filterFrom} />
    </div>
    <div class="form-group">
      <label for="f-to">To</label>
      <input id="f-to" type="date" bind:value={filterTo} />
    </div>
  </div>

  <!-- Chart -->
  <div class="card mb-3">
    <h3 class="mb-2">Daily Consumption</h3>
    <ConsumptionChart data={dailyData()} height={200} />
  </div>

  <!-- History Table -->
  {#if loading}
    <div class="loading">Loading consumption data...</div>
  {:else if filteredLogs.length === 0}
    <div class="empty-state">No consumption records found. Log some usage above!</div>
  {:else}
    <div class="card table-card">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Device</th>
              <th>Duration</th>
              <th>kWh</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredLogs as log (log.id)}
              <tr>
                <td>{formatDate(log.started_at)}</td>
                <td>{log.device_name ?? getDeviceName(log.device_id)}</td>
                <td>{formatDuration(log.duration_minutes)}</td>
                <td>{log.kwh.toFixed(2)}</td>
                <td>€{(log.kwh * pricePerKwh).toFixed(2)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .log-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    align-items: end;
  }
  .form-submit {
    display: flex;
    align-items: flex-end;
  }
  .filter-bar {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .filter-bar .form-group {
    margin-bottom: 0;
    min-width: 160px;
    max-width: 220px;
  }
  .table-card {
    padding: 0;
    overflow: hidden;
  }
  .table-scroll {
    overflow-x: auto;
  }
  .table-scroll table {
    min-width: 520px;
  }
  .table-scroll th:first-child,
  .table-scroll td:first-child {
    padding-left: 1.25rem;
  }
  .table-scroll th:last-child,
  .table-scroll td:last-child {
    padding-right: 1.25rem;
  }
  .success-banner {
    background: rgba(34, 197, 94, 0.1);
    color: var(--success);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }
</style>
