<script lang="ts">
	import { onMount } from 'svelte';
	import { getBudgets, createBudget, updateBudget, getBudgetStatus } from '$lib/api';

	let budgets: any[] = $state([]);
	let currentStatus: any = $state(null);
	let loading = $state(true);
	let error = $state('');
	let showModal = $state(false);
	let editingYm = $state('');

	const now = new Date();
	const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	let form = $state({
		year_month: currentYm,
		budget_kwh: 500,
		price_per_kwh: 0.15,
		alert_threshold_percent: 80
	});

	async function load() {
		try {
			budgets = await getBudgets();
			try {
				currentStatus = await getBudgetStatus(currentYm);
			} catch {
				currentStatus = null;
			}
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function openCreate() {
		editingYm = '';
		form = {
			year_month: currentYm,
			budget_kwh: 500,
			price_per_kwh: 0.15,
			alert_threshold_percent: 80
		};
		showModal = true;
	}

	function openEdit(b: any) {
		editingYm = b.year_month;
		form = {
			year_month: b.year_month,
			budget_kwh: b.budget_kwh,
			price_per_kwh: b.price_per_kwh,
			alert_threshold_percent: b.alert_threshold_percent
		};
		showModal = true;
	}

	async function handleSubmit() {
		try {
			if (editingYm) {
				await updateBudget(editingYm, {
					budget_kwh: form.budget_kwh,
					price_per_kwh: form.price_per_kwh,
					alert_threshold_percent: form.alert_threshold_percent
				});
			} else {
				await createBudget(form);
			}
			showModal = false;
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	function gaugeColor(pct: number): string {
		if (pct >= 90) return '#ef4444';
		if (pct >= 70) return '#f59e0b';
		return '#22c55e';
	}
</script>

<div class="page-header">
	<h1>Budget</h1>
	<button class="btn-primary" onclick={openCreate}>+ Set Monthly Budget</button>
</div>

{#if error}
	<p style="color:var(--danger);margin-bottom:12px">{error}</p>
{/if}

{#if loading}
	<p>Loading...</p>
{:else}
	<!-- Current Month Status -->
	{#if currentStatus}
		<div class="card" style="margin-bottom:24px">
			<h3 style="margin-bottom:16px">Current Month: {currentStatus.year_month}</h3>
			<div class="grid-4" style="margin-bottom:16px">
				<div>
					<div class="stat-label">Budget</div>
					<div class="stat-value" style="font-size:22px">{currentStatus.budget_kwh} kWh</div>
				</div>
				<div>
					<div class="stat-label">Used</div>
					<div class="stat-value" style="font-size:22px">{currentStatus.used_kwh.toFixed(1)} kWh</div>
				</div>
				<div>
					<div class="stat-label">Remaining</div>
					<div class="stat-value" style="font-size:22px">{currentStatus.remaining_kwh.toFixed(1)} kWh</div>
				</div>
				<div>
					<div class="stat-label">Est. Cost</div>
					<div class="stat-value" style="font-size:22px">€{currentStatus.estimated_cost.toFixed(2)}</div>
				</div>
			</div>

			<!-- Visual Gauge -->
			<div style="margin-bottom:8px;display:flex;justify-content:space-between">
				<span>Usage: {currentStatus.used_percent}%</span>
				<span style="color:var(--text-muted)">Threshold: {currentStatus.alert_threshold_percent}%</span>
			</div>
			<div class="gauge-bar" style="height:20px;position:relative">
				<div
					class="gauge-fill"
					style="width:{Math.min(currentStatus.used_percent, 100)}%;background:{gaugeColor(currentStatus.used_percent)}"
				></div>
				<!-- Threshold marker -->
				<div
					style="position:absolute;left:{currentStatus.alert_threshold_percent}%;top:0;bottom:0;width:2px;background:var(--warning)"
				></div>
			</div>

			<div class="grid-2" style="margin-top:16px">
				<div>
					<span style="color:var(--text-muted)">Projected end-of-month:</span>
					<strong>{currentStatus.projected_end_of_month_kwh.toFixed(1)} kWh</strong>
					{#if currentStatus.projected_end_of_month_kwh > currentStatus.budget_kwh}
						<span class="badge badge-red" style="margin-left:8px">Over budget!</span>
					{:else}
						<span class="badge badge-green" style="margin-left:8px">On track</span>
					{/if}
				</div>
				<div>
					<span style="color:var(--text-muted)">Price per kWh:</span>
					<strong>€{currentStatus.price_per_kwh}</strong>
				</div>
			</div>

			{#if currentStatus.is_over_threshold}
				<div style="margin-top:12px;padding:10px;background:rgba(239,68,68,0.15);border-radius:8px;border:1px solid rgba(239,68,68,0.3)">
					⚠️ You've exceeded {currentStatus.alert_threshold_percent}% of your monthly budget!
				</div>
			{/if}
		</div>
	{:else}
		<div class="card" style="margin-bottom:24px;text-align:center;padding:40px">
			<p style="color:var(--text-muted);margin-bottom:12px">No budget set for {currentYm}</p>
			<button class="btn-primary" onclick={openCreate}>Set Budget</button>
		</div>
	{/if}

	<!-- Budget History -->
	<div class="card">
		<h3 style="margin-bottom:12px">Budget History</h3>
		<table>
			<thead>
				<tr>
					<th>Month</th>
					<th>Budget (kWh)</th>
					<th>Price (€/kWh)</th>
					<th>Threshold</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each budgets as b}
					<tr>
						<td><strong>{b.year_month}</strong></td>
						<td>{b.budget_kwh}</td>
						<td>€{b.price_per_kwh}</td>
						<td>{b.alert_threshold_percent}%</td>
						<td>
							<button class="btn-ghost" style="padding:4px 10px;font-size:13px" onclick={() => openEdit(b)}>Edit</button>
						</td>
					</tr>
				{/each}
				{#if budgets.length === 0}
					<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No budgets configured</td></tr>
				{/if}
			</tbody>
		</table>
	</div>
{/if}

<!-- Modal -->
{#if showModal}
	<div class="modal-overlay" onclick={() => (showModal = false)} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<h2>{editingYm ? 'Edit Budget' : 'Set Monthly Budget'}</h2>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				{#if !editingYm}
					<div class="form-group">
						<label for="ym">Month (YYYY-MM)</label>
						<input id="ym" bind:value={form.year_month} required placeholder="2024-01" />
					</div>
				{/if}
				<div class="form-group">
					<label for="budget_kwh">Budget (kWh)</label>
					<input id="budget_kwh" type="number" bind:value={form.budget_kwh} required min="1" step="0.1" />
				</div>
				<div class="form-group">
					<label for="price">Price per kWh (€)</label>
					<input id="price" type="number" bind:value={form.price_per_kwh} required min="0.01" step="0.01" />
				</div>
				<div class="form-group">
					<label for="threshold">Alert Threshold (%)</label>
					<input id="threshold" type="number" bind:value={form.alert_threshold_percent} required min="0" max="100" />
				</div>
				<div class="form-actions">
					<button type="button" class="btn-ghost" onclick={() => (showModal = false)}>Cancel</button>
					<button type="submit" class="btn-primary">{editingYm ? 'Update' : 'Create'}</button>
				</div>
			</form>
		</div>
	</div>
{/if}
