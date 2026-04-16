<script lang="ts">
	import { onMount } from 'svelte';
	import { consumption, schedules, budget } from '$lib/api';
	import type { BudgetStatus } from '$lib/types';

	let stats: any = $state({ total_kwh: 0, total_cost: 0, by_device: [] });
	let todaySchedules: any[] = $state([]);
	let budgetStatus: BudgetStatus | null = $state(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			const currentMonth = new Date().toISOString().slice(0, 7);
			
			// Load current month stats
			const statsData = await consumption.stats({ period: 'month' });
			stats = statsData;
			
			// Load today's schedules
			const schedulesData = await schedules.today();
			todaySchedules = schedulesData.schedules || [];
			
			// Load budget status
			try {
				const statusData = await budget.status(currentMonth);
				budgetStatus = statusData;
			} catch (e) {
				console.log('No budget set for current month');
			}
		} catch (error) {
			console.error('Error loading dashboard:', error);
		} finally {
			loading = false;
		}
	});
</script>

<div class="container">
	<h1>Dashboard</h1>

	{#if loading}
		<p>Loading...</p>
	{:else}
		<div class="stats-grid">
			<div class="stat-card">
				<h3>This Month</h3>
				<p class="stat-value">{stats.total_kwh.toFixed(2)} kWh</p>
				<p class="stat-label">Total Consumption</p>
			</div>

			<div class="stat-card">
				<h3>Cost</h3>
				<p class="stat-value">€{stats.total_cost.toFixed(2)}</p>
				<p class="stat-label">Estimated Cost</p>
			</div>

			{#if budgetStatus}
				<div class="stat-card" class:alert={budgetStatus.is_over_threshold}>
					<h3>Budget</h3>
					<p class="stat-value">{budgetStatus.used_percent.toFixed(1)}%</p>
					<p class="stat-label">{budgetStatus.used_kwh.toFixed(2)} / {budgetStatus.budget_kwh} kWh</p>
					{#if budgetStatus.is_over_threshold}
						<p class="alert-text">⚠️ Over {budgetStatus.alert_threshold_percent}% threshold</p>
					{/if}
				</div>

				<div class="stat-card">
					<h3>Projected</h3>
					<p class="stat-value">{budgetStatus.projected_end_of_month_kwh.toFixed(2)} kWh</p>
					<p class="stat-label">End of Month Estimate</p>
				</div>
			{/if}
		</div>

		<div class="section">
			<h2>Top 5 Consuming Devices</h2>
			<table>
				<thead>
					<tr>
						<th>Device</th>
						<th>Consumption</th>
					</tr>
				</thead>
				<tbody>
					{#each stats.by_device.slice(0, 5) as device}
						<tr>
							<td>{device.name}</td>
							<td>{device.total_kwh.toFixed(2)} kWh</td>
						</tr>
					{:else}
						<tr>
							<td colspan="2">No consumption data</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="section">
			<h2>Today's Schedule</h2>
			{#if todaySchedules.length > 0}
				<table>
					<thead>
						<tr>
							<th>Device</th>
							<th>Time</th>
							<th>Power</th>
						</tr>
					</thead>
					<tbody>
						{#each todaySchedules as schedule}
							<tr>
								<td>{schedule.device_name}</td>
								<td>{schedule.start_time} - {schedule.end_time}</td>
								<td>{schedule.wattage}W</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p>No schedules for today</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		margin-bottom: 2rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: #f5f5f5;
		padding: 1.5rem;
		border-radius: 8px;
	}

	.stat-card.alert {
		background: #fff3cd;
		border: 2px solid #ffc107;
	}

	.stat-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.9rem;
		color: #666;
		text-transform: uppercase;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: bold;
		margin: 0.5rem 0;
		color: #333;
	}

	.stat-label {
		font-size: 0.85rem;
		color: #666;
		margin: 0;
	}

	.alert-text {
		color: #856404;
		font-weight: bold;
		margin-top: 0.5rem;
	}

	.section {
		margin-bottom: 2rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: white;
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

	tbody tr:hover {
		background: #f9f9f9;
	}
</style>
