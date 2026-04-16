<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchBudgets, createBudget, updateBudget, getBudgetStatus } from '$lib/api';
  import type { Budget, BudgetStatus } from '$lib/types';
  import BudgetGauge from '$lib/components/BudgetGauge.svelte';

  let loading = $state(true);
  let error = $state('');
  let budgets: Budget[] = $state([]);
  let currentStatus: BudgetStatus | null = $state(null);
  let currentBudget: Budget | null = $state(null);

  // Form
  let formYearMonth = $state('');
  let formBudgetKwh = $state(300);
  let formPricePerKwh = $state(0.15);
  let formAlertThreshold = $state(80);
  let saving = $state(false);
  let editMode = $state(false);

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  function formatMonth(ym: string): string {
    try {
      const [y, m] = ym.split('-');
      const date = new Date(Number(y), Number(m) - 1);
      return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  }

  function formatCost(val: number): string {
    return `€${val.toFixed(2)}`;
  }

  function startEdit(budget?: Budget) {
    if (budget) {
      formYearMonth = budget.year_month;
      formBudgetKwh = budget.budget_kwh;
      formPricePerKwh = budget.price_per_kwh;
      formAlertThreshold = budget.alert_threshold_percent;
      editMode = true;
    } else {
      formYearMonth = currentYearMonth;
      formBudgetKwh = 300;
      formPricePerKwh = 0.15;
      formAlertThreshold = 80;
      editMode = false;
    }
  }

  async function handleSubmit() {
    saving = true;
    error = '';
    try {
      const data = {
        year_month: formYearMonth,
        budget_kwh: formBudgetKwh,
        price_per_kwh: formPricePerKwh,
        alert_threshold_percent: formAlertThreshold
      };

      if (editMode) {
        const updated = await updateBudget(formYearMonth, data);
        budgets = budgets.map(b => b.year_month === updated.year_month ? updated : b);
        if (updated.year_month === currentYearMonth) {
          currentBudget = updated;
          try {
            currentStatus = await getBudgetStatus(currentYearMonth);
          } catch { /* ignore */ }
        }
      } else {
        const created = await createBudget(data);
        // Replace existing or add
        const idx = budgets.findIndex(b => b.year_month === created.year_month);
        if (idx >= 0) {
          budgets[idx] = created;
          budgets = [...budgets];
        } else {
          budgets = [...budgets, created];
        }
        if (created.year_month === currentYearMonth) {
          currentBudget = created;
          try {
            currentStatus = await getBudgetStatus(currentYearMonth);
          } catch { /* ignore */ }
        }
      }
      editMode = false;
    } catch (e: any) {
      error = e.message;
    } finally {
      saving = false;
    }
  }

  let sortedBudgets = $derived(
    [...budgets].sort((a, b) => b.year_month.localeCompare(a.year_month))
  );

  onMount(async () => {
    try {
      const allBudgets = await fetchBudgets();
      budgets = allBudgets;
      currentBudget = allBudgets.find(b => b.year_month === currentYearMonth) ?? null;

      if (currentBudget) {
        try {
          currentStatus = await getBudgetStatus(currentYearMonth);
        } catch { /* no status available */ }
      }

      // Init form
      startEdit(currentBudget ?? undefined);
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Budget - ElecTrack</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1>Budget</h1>
  </div>

  {#if error}
    <div class="error-state mb-2">{error}</div>
  {/if}

  {#if loading}
    <div class="loading">Loading budget data...</div>
  {:else}
    <!-- Current Month Status -->
    <div class="budget-top">
      <div class="card gauge-section">
        <h3>{formatMonth(currentYearMonth)}</h3>
        {#if currentStatus}
          <BudgetGauge
            used_percent={currentStatus.used_percent}
            threshold_percent={currentBudget?.alert_threshold_percent ?? 80}
          />
          <div class="status-metrics">
            <div class="status-item">
              <span class="status-label">Used</span>
              <span class="status-value">{currentStatus.used_kwh.toFixed(1)} kWh</span>
            </div>
            <div class="status-item">
              <span class="status-label">Budget</span>
              <span class="status-value">{currentStatus.budget_kwh.toFixed(0)} kWh</span>
            </div>
            <div class="status-item">
              <span class="status-label">Remaining</span>
              <span class="status-value" class:danger={currentStatus.remaining_kwh < 0}>
                {currentStatus.remaining_kwh.toFixed(1)} kWh
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Projected</span>
              <span class="status-value">{currentStatus.projected_end_of_month_kwh.toFixed(1)} kWh</span>
            </div>
            <div class="status-item">
              <span class="status-label">Est. Cost</span>
              <span class="status-value">{formatCost(currentStatus.estimated_cost)}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Proj. Cost</span>
              <span class="status-value">{formatCost(currentStatus.projected_cost)}</span>
            </div>
          </div>
        {:else}
          <div class="empty-state">No budget set for current month</div>
        {/if}
      </div>

      <!-- Budget Form -->
      <div class="card form-section">
        <h3 class="mb-2">{editMode ? 'Edit Budget' : 'Set Budget'}</h3>
        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div class="form-group">
            <label for="b-month">Month</label>
            <input id="b-month" type="month" bind:value={formYearMonth} />
          </div>
          <div class="form-group">
            <label for="b-kwh">Budget (kWh)</label>
            <input id="b-kwh" type="number" bind:value={formBudgetKwh} min="0" step="1" />
          </div>
          <div class="form-group">
            <label for="b-price">Price per kWh (EUR)</label>
            <input id="b-price" type="number" bind:value={formPricePerKwh} min="0" step="0.01" />
          </div>
          <div class="form-group">
            <label for="b-threshold">Alert Threshold (%)</label>
            <input id="b-threshold" type="number" bind:value={formAlertThreshold} min="0" max="100" step="1" />
          </div>
          <div class="form-actions">
            {#if editMode}
              <button type="button" class="btn btn-secondary" onclick={() => startEdit()}>New</button>
            {/if}
            <button type="submit" class="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editMode ? 'Update Budget' : 'Create Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Historical Budgets -->
    {#if sortedBudgets.length > 0}
      <div class="card mt-3">
        <h3 class="mb-2">Budget History</h3>
        <div class="budget-history">
          {#each sortedBudgets as budget (budget.year_month)}
            {@const usedPercent = currentStatus && budget.year_month === currentYearMonth
              ? currentStatus.used_percent
              : 0}
            <div class="history-row">
              <div class="history-info">
                <span class="history-month">{formatMonth(budget.year_month)}</span>
                <span class="history-meta">
                  {budget.budget_kwh} kWh | {formatCost(budget.price_per_kwh)}/kWh
                </span>
              </div>
              <div class="history-bar-container">
                <div class="history-bar-bg">
                  <div
                    class="history-bar"
                    class:over={usedPercent > budget.alert_threshold_percent}
                    style="width: {Math.min(usedPercent, 100)}%"
                  ></div>
                  <div
                    class="history-threshold"
                    style="left: {budget.alert_threshold_percent}%"
                  ></div>
                </div>
                <span class="history-percent">
                  {budget.year_month === currentYearMonth && currentStatus
                    ? `${usedPercent.toFixed(0)}%`
                    : '--'}
                </span>
              </div>
              <button
                class="btn btn-secondary btn-sm"
                onclick={() => startEdit(budget)}
              >
                Edit
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .budget-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .gauge-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .status-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    width: 100%;
  }
  .status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }
  .status-label {
    font-size: 0.72rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .status-value {
    font-size: 0.95rem;
    font-weight: 600;
  }
  .status-value.danger {
    color: var(--danger);
  }

  .form-section {
    display: flex;
    flex-direction: column;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .budget-history {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .history-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border);
  }
  .history-row:last-child {
    border-bottom: none;
  }
  .history-info {
    min-width: 160px;
    display: flex;
    flex-direction: column;
  }
  .history-month {
    font-weight: 600;
    font-size: 0.875rem;
  }
  .history-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  .history-bar-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .history-bar-bg {
    flex: 1;
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: visible;
    position: relative;
  }
  .history-bar {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.4s ease;
  }
  .history-bar.over {
    background: var(--danger);
  }
  .history-threshold {
    position: absolute;
    top: -3px;
    width: 2px;
    height: 14px;
    background: var(--text-muted);
    border-radius: 1px;
  }
  .history-percent {
    font-size: 0.78rem;
    font-weight: 600;
    min-width: 36px;
    text-align: right;
  }

  @media (max-width: 768px) {
    .budget-top {
      grid-template-columns: 1fr;
    }
    .status-metrics {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
