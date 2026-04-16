<script lang="ts">
  import { onMount } from 'svelte';
  import { getBudgetStatus, fetchConsumptionStats, fetchTodaySchedules } from '$lib/api';
  import type { BudgetStatus, ConsumptionStats, Schedule } from '$lib/types';
  import BudgetGauge from '$lib/components/BudgetGauge.svelte';

  let loading = $state(true);
  let error = $state('');
  let budgetStatus: BudgetStatus | null = $state(null);
  let stats: ConsumptionStats | null = $state(null);
  let todaySchedules: Schedule[] = $state([]);

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function formatCost(val: number): string {
    return `€${val.toFixed(2)}`;
  }

  onMount(async () => {
    try {
      const [bs, st, ts] = await Promise.allSettled([
        getBudgetStatus(yearMonth),
        fetchConsumptionStats({ from: `${yearMonth}-01`, to: `${yearMonth}-31` }),
        fetchTodaySchedules()
      ]);
      if (bs.status === 'fulfilled') budgetStatus = bs.value;
      if (st.status === 'fulfilled') stats = st.value;
      if (ts.status === 'fulfilled') todaySchedules = ts.value;
    } catch (e: any) {
      error = e.message || 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Dashboard - ElecTrack</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1>Dashboard</h1>
    <span class="month-label">{monthName}</span>
  </div>

  {#if loading}
    <div class="loading">Loading dashboard...</div>
  {:else if error}
    <div class="error-state">{error}</div>
  {:else}
    <!-- Budget Gauge -->
    <div class="dashboard-top">
      <div class="card gauge-card">
        <h3>Monthly Budget</h3>
        {#if budgetStatus}
          <BudgetGauge
            used_percent={budgetStatus.used_percent}
            threshold_percent={80}
          />
          <div class="gauge-detail">
            {budgetStatus.used_kwh.toFixed(1)} / {budgetStatus.budget_kwh.toFixed(1)} kWh
          </div>
        {:else}
          <div class="empty-state">No budget set for {monthName}</div>
        {/if}
      </div>

      <!-- Metrics -->
      <div class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-label">Total kWh</div>
          <div class="metric-value">{stats?.total_kwh?.toFixed(2) ?? '0.00'}</div>
        </div>
        <div class="card metric-card">
          <div class="metric-label">Estimated Cost</div>
          <div class="metric-value">{formatCost(budgetStatus?.estimated_cost ?? stats?.total_cost ?? 0)}</div>
        </div>
        <div class="card metric-card">
          <div class="metric-label">Daily Average</div>
          <div class="metric-value">{stats?.avg_daily_kwh?.toFixed(2) ?? '0.00'} kWh</div>
        </div>
        <div class="card metric-card">
          <div class="metric-label">Budget Remaining</div>
          <div class="metric-value" class:danger={budgetStatus ? budgetStatus.remaining_kwh < 0 : false}>
            {budgetStatus ? budgetStatus.remaining_kwh.toFixed(1) : '--'} kWh
          </div>
        </div>
      </div>
    </div>

    <!-- Top devices + Today's schedule -->
    <div class="dashboard-bottom">
      <!-- Top Consuming Devices -->
      <div class="card">
        <h3 class="mb-2">Top Consuming Devices</h3>
        {#if stats && stats.by_device.length > 0}
          {@const topDevices = stats.by_device.slice(0, 5)}
          {@const maxKwh = Math.max(...topDevices.map(d => d.total_kwh), 0.01)}
          <div class="top-devices">
            {#each topDevices as device}
              <div class="top-device-row">
                <div class="top-device-info">
                  <span class="top-device-name">{device.device_name}</span>
                  <span class="top-device-kwh">{device.total_kwh.toFixed(2)} kWh</span>
                </div>
                <div class="top-device-bar-bg">
                  <div
                    class="top-device-bar"
                    style="width: {(device.total_kwh / maxKwh) * 100}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">No consumption data yet</div>
        {/if}
      </div>

      <!-- Today's Schedule -->
      <div class="card">
        <h3 class="mb-2">Today's Schedule</h3>
        {#if todaySchedules.length > 0}
          <div class="today-schedules">
            {#each todaySchedules as s}
              <div class="today-entry" class:disabled={!s.enabled}>
                <div class="today-time">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</div>
                <div class="today-device">{s.device_name ?? `Device #${s.device_id}`}</div>
                {#if !s.enabled}
                  <span class="badge badge-other">Off</span>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">No schedules for today</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .month-label {
    font-size: 0.9rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .dashboard-top {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .gauge-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }
  .gauge-detail {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .metric-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .metric-label {
    font-size: 0.78rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 500;
  }
  .metric-value {
    font-size: 1.5rem;
    font-weight: 700;
  }
  .metric-value.danger {
    color: var(--danger);
  }

  .dashboard-bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .top-devices {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .top-device-row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .top-device-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
  }
  .top-device-name {
    font-weight: 500;
  }
  .top-device-kwh {
    color: var(--text-muted);
  }
  .top-device-bar-bg {
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    overflow: hidden;
  }
  .top-device-bar {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .today-schedules {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .today-entry {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.6rem;
    background: var(--bg);
    border-radius: 8px;
    font-size: 0.85rem;
  }
  .today-entry.disabled {
    opacity: 0.5;
  }
  .today-time {
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
    font-size: 0.8rem;
  }
  .today-device {
    flex: 1;
  }

  @media (max-width: 768px) {
    .dashboard-top {
      grid-template-columns: 1fr;
    }
    .dashboard-bottom {
      grid-template-columns: 1fr;
    }
  }
</style>
