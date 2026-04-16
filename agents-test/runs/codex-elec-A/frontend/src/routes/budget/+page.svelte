<script lang="ts">
	import { onMount } from 'svelte';
	import Gauge from '$lib/components/Gauge.svelte';
	import { api } from '$lib/api';
	import type { Budget, BudgetDetail } from '$lib/types';
	import { currentYearMonth, formatCurrency, formatKwh, formatPercent, monthLabel } from '$lib/utils';

	let budgets: Budget[] = [];
	let currentBudget: BudgetDetail | null = null;
	let loading = true;
	let saving = false;
	let error = '';
	let selectedMonth = currentYearMonth();

	let form = {
		budgetKwh: 350,
		pricePerKwh: 0.23,
		alertThresholdPercent: 80
	};

	onMount(loadBudgetPage);

	async function loadBudgetPage() {
		loading = true;
		error = '';

		try {
			budgets = await api.get<Budget[]>('/api/budget');
			await loadMonth(selectedMonth, false);
		} catch (loadError) {
			error = loadError instanceof Error ? loadError.message : 'Unable to load budgets';
		} finally {
			loading = false;
		}
	}

	async function loadMonth(month: string, useLoadingState = true) {
		selectedMonth = month;
		if (useLoadingState) {
			loading = true;
		}
		error = '';

		try {
			currentBudget = await api.get<BudgetDetail>(`/api/budget/${month}`);
			form = {
				budgetKwh: currentBudget.budget_kwh,
				pricePerKwh: currentBudget.price_per_kwh,
				alertThresholdPercent: currentBudget.alert_threshold_percent
			};
		} catch (loadError) {
			const message = loadError instanceof Error ? loadError.message : 'Unable to load budget';
			if (message === 'Budget not found') {
				currentBudget = null;
				form = {
					budgetKwh: 350,
					pricePerKwh: budgets[0]?.price_per_kwh ?? 0.23,
					alertThresholdPercent: 80
				};
			} else {
				error = message;
			}
		} finally {
			if (useLoadingState) {
				loading = false;
			}
		}
	}

	async function saveBudget() {
		saving = true;
		error = '';

		try {
			if (currentBudget && currentBudget.year_month === selectedMonth) {
				currentBudget = await api.put<BudgetDetail>(`/api/budget/${selectedMonth}`, {
					budget_kwh: Number(form.budgetKwh),
					price_per_kwh: Number(form.pricePerKwh),
					alert_threshold_percent: Number(form.alertThresholdPercent)
				});
			} else {
				currentBudget = await api.post<BudgetDetail>('/api/budget', {
					year_month: selectedMonth,
					budget_kwh: Number(form.budgetKwh),
					price_per_kwh: Number(form.pricePerKwh),
					alert_threshold_percent: Number(form.alertThresholdPercent)
				});
			}

			budgets = await api.get<Budget[]>('/api/budget');
		} catch (saveError) {
			error = saveError instanceof Error ? saveError.message : 'Unable to save budget';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Budget | Gridwise Home Energy</title>
</svelte:head>

<section class="grid-2 fade-in">
	<div class="panel">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h2>Monthly budget</h2>
					<p>Set a kWh target, electricity rate, and alert threshold for any month.</p>
				</div>
			</div>

			<div class="field">
				<label for="month">Month</label>
				<input
					id="month"
					class="input"
					type="month"
					bind:value={selectedMonth}
					on:change={() => loadMonth(selectedMonth)}
				/>
			</div>

			<form class="stack" on:submit|preventDefault={saveBudget}>
				<div class="grid-2">
					<div class="field">
						<label for="budgetKwh">Budget kWh</label>
						<input id="budgetKwh" class="input" type="number" min="1" step="0.1" bind:value={form.budgetKwh} />
					</div>
					<div class="field">
						<label for="price">Price per kWh (EUR)</label>
						<input id="price" class="input" type="number" min="0.01" step="0.01" bind:value={form.pricePerKwh} />
					</div>
				</div>

				<div class="field">
					<label for="threshold">Alert threshold (%)</label>
					<input
						id="threshold"
						class="input"
						type="number"
						min="1"
						max="100"
						step="1"
						bind:value={form.alertThresholdPercent}
					/>
				</div>

				<div class="actions">
					<button class="button" type="submit" disabled={saving}>
						{saving ? 'Saving...' : currentBudget ? 'Update budget' : 'Create budget'}
					</button>
				</div>
			</form>

			{#if error}
				<div class="error">{error}</div>
			{/if}
		</div>
	</div>

	<div class="panel">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h2>Status</h2>
					<p>Live usage, remaining room, and end-of-month projection.</p>
				</div>
			</div>

			{#if loading}
				<div class="empty">Loading budget status...</div>
			{:else if currentBudget}
				<div class="stack">
					<Gauge
						label={monthLabel(currentBudget.year_month)}
						value={currentBudget.used_kwh}
						max={currentBudget.budget_kwh}
						threshold={currentBudget.alert_threshold_percent / 100 * currentBudget.budget_kwh}
						footer={`Projected month-end use: ${formatKwh(currentBudget.projected_end_of_month_kwh)}`}
					/>
					<div class="grid-2">
						<div class="card">
							<div class="muted">Used</div>
							<h3>{formatKwh(currentBudget.used_kwh)}</h3>
							<p class="muted">{formatPercent(currentBudget.used_percent)} of budget</p>
						</div>
						<div class="card">
							<div class="muted">Estimated cost</div>
							<h3>{formatCurrency(currentBudget.estimated_cost)}</h3>
							<p class="muted">At {formatCurrency(currentBudget.price_per_kwh)} per kWh</p>
						</div>
						<div class="card">
							<div class="muted">Remaining</div>
							<h3>{formatKwh(currentBudget.remaining_kwh)}</h3>
						</div>
						<div class="card">
							<div class="muted">Threshold</div>
							<h3>{currentBudget.alert_threshold_percent}%</h3>
							<p class="muted">{currentBudget.is_over_threshold ? 'Alert active' : 'Below alert line'}</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="empty">No budget exists for {monthLabel(selectedMonth)} yet.</div>
			{/if}
		</div>
	</div>
</section>

<section class="panel fade-in">
	<div class="panel-inner stack">
		<div class="section-title">
			<div>
				<h3>Budget history</h3>
				<p>Select a saved month to edit its targets and pricing.</p>
			</div>
		</div>

		{#if budgets.length === 0}
			<div class="empty">No budgets have been created yet.</div>
		{:else}
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th>Month</th>
							<th>Budget</th>
							<th>Price</th>
							<th>Alert threshold</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each budgets as budget}
							<tr>
								<td>{monthLabel(budget.year_month)}</td>
								<td>{formatKwh(budget.budget_kwh)}</td>
								<td>{formatCurrency(budget.price_per_kwh)}</td>
								<td>{budget.alert_threshold_percent}%</td>
								<td>
									<button class="button-ghost" type="button" on:click={() => loadMonth(budget.year_month)}>
										Open
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>

<style>
	h3,
	p {
		margin: 0;
	}
</style>
