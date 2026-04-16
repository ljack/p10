<script lang="ts">
	import { onMount } from 'svelte';
	import { budget } from '$lib/api';
	import type { Budget, BudgetStatus } from '$lib/types';

	let budgets: Budget[] = $state([]);
	let currentMonth = $state('');
	let currentStatus: BudgetStatus | null = $state(null);
	let showModal = $state(false);
	let editingBudget: Partial<Budget> | null = $state(null);
	let loading = $state(true);

	onMount(async () => {
		currentMonth = new Date().toISOString().slice(0, 7);
		await loadData();
	});

	async function loadData() {
		try {
			const data = await budget.list();
			budgets = data.budgets;
			
			// Load current month status
			try {
				currentStatus = await budget.status(currentMonth);
			} catch (e) {
				console.log('No budget for current month');
			}
		} catch (error) {
			alert('Error loading budgets: ' + error);
		} finally {
			loading = false;
		}
	}

	function openAddModal() {
		const nextMonth = new Date();
		nextMonth.setMonth(nextMonth.getMonth() + 1);
		const yearMonth = nextMonth.toISOString().slice(0, 7);
		
		editingBudget = {
			year_month: yearMonth,
			budget_kwh: 300,
			price_per_kwh: 0.15,
			alert_threshold_percent: 80
		};
		showModal = true;
	}

	function openEditModal(b: Budget) {
		editingBudget = { ...b };
		showModal = true;
	}

	async function saveBudget() {
		if (!editingBudget || !editingBudget.year_month) return;

		try {
			if (editingBudget.id) {
				await budget.update(editingBudget.year_month, editingBudget);
			} else {
				await budget.create(editingBudget);
			}
			showModal = false;
			editingBudget = null;
			await loadData();
		} catch (error) {
			alert('Error saving budget: ' + error);
		}
	}
</script>

<div class="container">
	<div class="header">
		<h1>Budget Management</h1>
		<button onclick={openAddModal} class="btn-primary">+ Set Budget</button>
	</div>

	{#if loading}
		<p>Loading...</p>
	{:else}
		{#if currentStatus}
			<div class="current-status">
				<h2>Current Month: {currentMonth}</h2>
				
				<div class="status-grid">
					<div class="status-card">
						<h3>Budget</h3>
						<p class="big-number">{currentStatus.budget_kwh}</p>
						<p class="label">kWh</p>
					</div>

					<div class="status-card">
						<h3>Used</h3>
						<p class="big-number">{currentStatus.used_kwh.toFixed(2)}</p>
						<p class="label">{currentStatus.used_percent.toFixed(1)}%</p>
					</div>

					<div class="status-card">
						<h3>Remaining</h3>
						<p class="big-number">{currentStatus.remaining_kwh.toFixed(2)}</p>
						<p class="label">kWh</p>
					</div>

					<div class="status-card">
						<h3>Projected</h3>
						<p class="big-number">{currentStatus.projected_end_of_month_kwh.toFixed(2)}</p>
						<p class="label">End of Month</p>
					</div>
				</div>

				<div class="progress-bar-container">
					<div 
						class="progress-bar" 
						class:warning={currentStatus.used_percent >= currentStatus.alert_threshold_percent && currentStatus.used_percent < 100}
						class:danger={currentStatus.used_percent >= 100}
						style="width: {Math.min(currentStatus.used_percent, 100)}%"
					>
						<span>{currentStatus.used_percent.toFixed(1)}%</span>
					</div>
					<div class="threshold-marker" style="left: {currentStatus.alert_threshold_percent}%"></div>
				</div>

				{#if currentStatus.is_over_threshold}
					<div class="alert alert-warning">
						⚠️ You have exceeded {currentStatus.alert_threshold_percent}% of your budget!
					</div>
				{/if}

				{#if currentStatus.projected_end_of_month_kwh > currentStatus.budget_kwh}
					<div class="alert alert-danger">
						🚨 Projected to exceed budget by {(currentStatus.projected_end_of_month_kwh - currentStatus.budget_kwh).toFixed(2)} kWh
						(€{((currentStatus.projected_end_of_month_kwh - currentStatus.budget_kwh) * currentStatus.price_per_kwh).toFixed(2)} over)
					</div>
				{/if}

				<div class="cost-summary">
					<div class="cost-item">
						<span>Current Cost:</span>
						<strong>€{currentStatus.estimated_cost.toFixed(2)}</strong>
					</div>
					<div class="cost-item">
						<span>Projected Cost:</span>
						<strong>€{currentStatus.projected_cost.toFixed(2)}</strong>
					</div>
					<div class="cost-item">
						<span>Budget Cost:</span>
						<strong>€{(currentStatus.budget_kwh * currentStatus.price_per_kwh).toFixed(2)}</strong>
					</div>
				</div>
			</div>
		{:else}
			<div class="alert alert-info">
				No budget set for the current month. Click "Set Budget" to create one.
			</div>
		{/if}

		<div class="budgets-list">
			<h2>All Budgets</h2>
			<table>
				<thead>
					<tr>
						<th>Month</th>
						<th>Budget (kWh)</th>
						<th>Price/kWh</th>
						<th>Alert Threshold</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each budgets as b}
						<tr>
							<td>{b.year_month}</td>
							<td>{b.budget_kwh}</td>
							<td>€{b.price_per_kwh}</td>
							<td>{b.alert_threshold_percent}%</td>
							<td>
								<button onclick={() => openEditModal(b)} class="btn-small">Edit</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5">No budgets configured</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if showModal && editingBudget}
	<div class="modal-backdrop" onclick={() => showModal = false}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>{editingBudget.id ? 'Edit' : 'Set'} Budget</h2>
			
			<form onsubmit={(e) => { e.preventDefault(); saveBudget(); }}>
				<label>
					Month (YYYY-MM):
					<input 
						type="month" 
						bind:value={editingBudget.year_month} 
						disabled={!!editingBudget.id}
						required 
					/>
				</label>

				<label>
					Budget (kWh):
					<input type="number" bind:value={editingBudget.budget_kwh} min="1" step="0.1" required />
				</label>

				<label>
					Price per kWh (€):
					<input type="number" bind:value={editingBudget.price_per_kwh} min="0" step="0.01" required />
				</label>

				<label>
					Alert Threshold (%):
					<input type="number" bind:value={editingBudget.alert_threshold_percent} min="1" max="100" required />
				</label>

				<div class="modal-actions">
					<button type="submit" class="btn-primary">Save</button>
					<button type="button" onclick={() => showModal = false}>Cancel</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.current-status {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.status-card {
		background: #f5f5f5;
		padding: 1.5rem;
		border-radius: 8px;
		text-align: center;
	}

	.status-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.9rem;
		color: #666;
		text-transform: uppercase;
	}

	.big-number {
		font-size: 2.5rem;
		font-weight: bold;
		margin: 0.5rem 0;
		color: #333;
	}

	.label {
		font-size: 0.9rem;
		color: #666;
		margin: 0;
	}

	.progress-bar-container {
		position: relative;
		height: 40px;
		background: #e0e0e0;
		border-radius: 20px;
		margin: 2rem 0;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: #007bff;
		border-radius: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: bold;
		transition: width 0.3s, background 0.3s;
		min-width: 50px;
	}

	.progress-bar.warning {
		background: #ffc107;
	}

	.progress-bar.danger {
		background: #dc3545;
	}

	.threshold-marker {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: #666;
		opacity: 0.5;
	}

	.threshold-marker::before {
		content: '⚠';
		position: absolute;
		top: -20px;
		left: -8px;
		font-size: 16px;
	}

	.alert {
		padding: 1rem;
		border-radius: 4px;
		margin: 1rem 0;
	}

	.alert-info {
		background: #cce5ff;
		color: #004085;
		border: 1px solid #b8daff;
	}

	.alert-warning {
		background: #fff3cd;
		color: #856404;
		border: 1px solid #ffc107;
	}

	.alert-danger {
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #dc3545;
	}

	.cost-summary {
		background: #f9f9f9;
		padding: 1.5rem;
		border-radius: 8px;
		margin-top: 1.5rem;
	}

	.cost-item {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid #ddd;
	}

	.cost-item:last-child {
		border-bottom: none;
	}

	.budgets-list {
		background: white;
		padding: 2rem;
		border-radius: 8px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1rem;
	}

	th, td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #ddd;
	}

	th {
		background: #f5f5f5;
		font-weight: 600;
	}

	.btn-primary {
		background: #007bff;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #0056b3;
	}

	.btn-small {
		padding: 0.25rem 0.5rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-small:hover {
		background: #f5f5f5;
	}

	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		width: 90%;
		max-width: 500px;
	}

	.modal h2 {
		margin-top: 0;
	}

	.modal form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.modal input {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
	}
</style>
