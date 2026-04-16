<script lang="ts">
	import { onMount } from 'svelte';
	import { budgetAPI } from '$lib/api';
	import type { Budget, BudgetStatus } from '$lib/api';

	let budgets = $state<Budget[]>([]);
	let currentBudget = $state<Budget | null>(null);
	let budgetStatus = $state<BudgetStatus | null>(null);
	let loading = $state(true);
	let showModal = $state(false);
	let editMode = $state(false);

	const currentMonth = new Date().toISOString().slice(0, 7);

	let formData = $state({
		year_month: currentMonth,
		budget_kwh: 500,
		price_per_kwh: 0.15,
		alert_threshold_percent: 80
	});

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		try {
			budgets = await budgetAPI.list();
			currentBudget = budgets.find((b) => b.year_month === currentMonth) || null;

			if (currentBudget) {
				budgetStatus = await budgetAPI.status(currentMonth);
			}
		} catch (error) {
			console.error('Error loading budgets:', error);
		} finally {
			loading = false;
		}
	}

	function openModal(budget?: Budget) {
		if (budget) {
			editMode = true;
			formData = {
				year_month: budget.year_month,
				budget_kwh: budget.budget_kwh,
				price_per_kwh: budget.price_per_kwh,
				alert_threshold_percent: budget.alert_threshold_percent
			};
		} else {
			editMode = false;
			formData = {
				year_month: currentMonth,
				budget_kwh: 500,
				price_per_kwh: 0.15,
				alert_threshold_percent: 80
			};
		}
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function handleSubmit() {
		try {
			if (editMode) {
				await budgetAPI.update(formData.year_month, {
					budget_kwh: formData.budget_kwh,
					price_per_kwh: formData.price_per_kwh,
					alert_threshold_percent: formData.alert_threshold_percent
				});
			} else {
				await budgetAPI.create(formData);
			}
			await loadData();
			closeModal();
		} catch (error: any) {
			alert('Error: ' + error.message);
		}
	}

	const budgetPercent = $derived(budgetStatus ? budgetStatus.used_percent : 0);
	const budgetClass = $derived(budgetPercent >= 100 ? 'danger' : budgetPercent >= 80 ? 'warning' : '');
</script>

<div class="flex justify-between items-center mb-2">
	<h1>Budget Management</h1>
	{#if !currentBudget}
		<button class="btn btn-primary" on:click={() => openModal()}>+ Set Budget</button>
	{/if}
</div>

{#if loading}
	<div class="card">
		<p>Loading...</p>
	</div>
{:else if !currentBudget}
	<div class="card">
		<p style="color: var(--gray-500); text-align: center;">
			No budget set for this month. Click "Set Budget" to create one.
		</p>
	</div>
{:else}
	<!-- Current Month Budget Status -->
	<div class="card">
		<div class="flex justify-between items-center mb-2">
			<h2>Current Month ({currentMonth})</h2>
			<button class="btn btn-secondary btn-sm" on:click={() => currentBudget && openModal(currentBudget)}>
				Edit Budget
			</button>
		</div>

		{#if budgetStatus}
			<div class="grid grid-3 mb-2">
				<div class="stat">
					<div class="stat-value">{budgetStatus.budget_kwh}</div>
					<div class="stat-label">Budget (kWh)</div>
				</div>
				<div class="stat">
					<div class="stat-value">{budgetStatus.used_kwh.toFixed(1)}</div>
					<div class="stat-label">Used (kWh)</div>
				</div>
				<div class="stat">
					<div class="stat-value">{budgetStatus.remaining_kwh.toFixed(1)}</div>
					<div class="stat-label">Remaining (kWh)</div>
				</div>
			</div>

			<div class="progress mb-1">
				<div class="progress-bar {budgetClass}" style="width: {Math.min(budgetPercent, 100)}%">
					{budgetPercent.toFixed(1)}%
				</div>
			</div>

			<div class="grid grid-2 mt-2">
				<div>
					<h3 style="font-size: 0.875rem; color: var(--gray-700); margin-bottom: 0.5rem;">
						Cost Information
					</h3>
					<p style="font-size: 0.875rem;">
						Price per kWh: <strong>€{budgetStatus.price_per_kwh.toFixed(3)}</strong>
					</p>
					<p style="font-size: 0.875rem;">
						Current Cost: <strong>€{budgetStatus.estimated_cost.toFixed(2)}</strong>
					</p>
					<p style="font-size: 0.875rem;">
						Projected End Cost:
						<strong
							>€{(budgetStatus.projected_end_of_month_kwh * budgetStatus.price_per_kwh).toFixed(
								2
							)}</strong
						>
					</p>
				</div>

				<div>
					<h3 style="font-size: 0.875rem; color: var(--gray-700); margin-bottom: 0.5rem;">
						Projections
					</h3>
					<p style="font-size: 0.875rem;">
						Projected Usage:
						<strong>{budgetStatus.projected_end_of_month_kwh.toFixed(1)} kWh</strong>
					</p>
					<p style="font-size: 0.875rem;">
						Alert Threshold: <strong>{currentBudget.alert_threshold_percent}%</strong>
					</p>
					{#if budgetStatus.is_over_threshold}
						<p style="color: var(--warning); font-size: 0.875rem; margin-top: 0.5rem;">
							⚠️ You've exceeded the alert threshold!
						</p>
					{/if}
					{#if budgetStatus.projected_end_of_month_kwh > budgetStatus.budget_kwh}
						<p style="color: var(--danger); font-size: 0.875rem; margin-top: 0.5rem;">
							⚠️ Projected to exceed budget by
							{(budgetStatus.projected_end_of_month_kwh - budgetStatus.budget_kwh).toFixed(1)}
							kWh
						</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Historical Budgets -->
	{#if budgets.length > 1}
		<div class="card">
			<h2>Historical Budgets</h2>
			<table>
				<thead>
					<tr>
						<th>Month</th>
						<th>Budget (kWh)</th>
						<th>Price/kWh</th>
						<th>Alert Threshold</th>
					</tr>
				</thead>
				<tbody>
					{#each budgets as budget}
						{#if budget.year_month !== currentMonth}
							<tr>
								<td>{budget.year_month}</td>
								<td>{budget.budget_kwh}</td>
								<td>€{budget.price_per_kwh.toFixed(3)}</td>
								<td>{budget.alert_threshold_percent}%</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/if}

<!-- Modal -->
{#if showModal}
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal" on:click|stopPropagation>
			<div class="modal-header">
				<h3>{editMode ? 'Edit Budget' : 'Set Budget'}</h3>
				<button class="btn btn-secondary btn-sm" on:click={closeModal}>✕</button>
			</div>

			<form on:submit|preventDefault={handleSubmit}>
				<div class="form-group">
					<label for="yearMonth">Month</label>
					<input
						id="yearMonth"
						type="month"
						bind:value={formData.year_month}
						required
						disabled={editMode}
					/>
				</div>

				<div class="form-group">
					<label for="budgetKwh">Budget (kWh)</label>
					<input
						id="budgetKwh"
						type="number"
						step="0.1"
						bind:value={formData.budget_kwh}
						required
						min="0"
					/>
				</div>

				<div class="form-group">
					<label for="pricePerKwh">Price per kWh (€)</label>
					<input
						id="pricePerKwh"
						type="number"
						step="0.001"
						bind:value={formData.price_per_kwh}
						required
						min="0"
					/>
				</div>

				<div class="form-group">
					<label for="alertThreshold">Alert Threshold (%)</label>
					<input
						id="alertThreshold"
						type="number"
						bind:value={formData.alert_threshold_percent}
						required
						min="0"
						max="100"
					/>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" on:click={closeModal}>Cancel</button>
					<button type="submit" class="btn btn-primary">
						{editMode ? 'Update' : 'Create'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
