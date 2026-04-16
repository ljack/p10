<script lang="ts">
	import { onMount } from 'svelte';
	import { consumptionAPI, scheduleAPI, budgetAPI } from '$lib/api';
	import type { ConsumptionStats, Schedule, BudgetStatus } from '$lib/api';

	let stats = $state<ConsumptionStats | null>(null);
	let todaySchedule = $state<Schedule[]>([]);
	let budgetStatus = $state<BudgetStatus | null>(null);
	let loading = $state(true);

	const currentMonth = new Date().toISOString().slice(0, 7);

	onMount(async () => {
		try {
			const [statsData, scheduleData, budgetData] = await Promise.all([
				consumptionAPI.stats({ period: 'month' }),
				scheduleAPI.today(),
				budgetAPI.status(currentMonth).catch(() => null)
			]);

			stats = statsData;
			todaySchedule = scheduleData;
			budgetStatus = budgetData;
		} catch (error) {
			console.error('Error loading dashboard:', error);
		} finally {
			loading = false;
		}
	});

	const topDevices = $derived(stats?.by_device?.slice(0, 5) || []);
	const budgetPercent = $derived(budgetStatus ? budgetStatus.used_percent : 0);
	const budgetClass = $derived(
		budgetPercent >= 100 ? 'danger' : budgetPercent >= 80 ? 'warning' : ''
	);
</script>

<h1 class="mb-2">Dashboard</h1>

{#if loading}
	<div class="card">
		<p>Loading...</p>
	</div>
{:else}
	<!-- Stats Overview -->
	<div class="grid grid-3">
		<div class="card">
			<div class="stat">
				<div class="stat-value">{stats?.total_kwh.toFixed(1) || 0} kWh</div>
				<div class="stat-label">This Month</div>
			</div>
		</div>

		<div class="card">
			<div class="stat">
				<div class="stat-value">€{stats?.total_cost.toFixed(2) || 0}</div>
				<div class="stat-label">Current Cost</div>
			</div>
		</div>

		<div class="card">
			<div class="stat">
				<div class="stat-value">{stats?.avg_daily_kwh.toFixed(1) || 0} kWh</div>
				<div class="stat-label">Daily Average</div>
			</div>
		</div>
	</div>

	<!-- Budget Status -->
	{#if budgetStatus}
		<div class="card">
			<h2>Monthly Budget</h2>
			<div class="progress">
				<div
					class="progress-bar {budgetClass}"
					style="width: {Math.min(budgetPercent, 100)}%"
				>
					{budgetPercent.toFixed(0)}%
				</div>
			</div>
			<div class="flex justify-between mt-1">
				<span class="text-sm"
					>{budgetStatus.used_kwh.toFixed(1)} / {budgetStatus.budget_kwh} kWh</span
				>
				<span class="text-sm">Remaining: {budgetStatus.remaining_kwh.toFixed(1)} kWh</span>
			</div>
			{#if budgetStatus.is_over_threshold}
				<p class="mt-1" style="color: var(--warning); font-size: 0.875rem;">
					⚠️ You've reached {budgetStatus.used_percent.toFixed(0)}% of your monthly budget
				</p>
			{/if}
			<p class="mt-1" style="color: var(--gray-600); font-size: 0.875rem;">
				Projected end of month: {budgetStatus.projected_end_of_month_kwh.toFixed(1)} kWh
			</p>
		</div>
	{/if}

	<div class="grid grid-2">
		<!-- Top Consuming Devices -->
		<div class="card">
			<h2>Top Consuming Devices</h2>
			{#if topDevices.length > 0}
				<table>
					<thead>
						<tr>
							<th>Device</th>
							<th>Usage (kWh)</th>
						</tr>
					</thead>
					<tbody>
						{#each topDevices as device}
							<tr>
								<td>{device.device_name}</td>
								<td>{device.total_kwh.toFixed(2)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p style="color: var(--gray-500);">No consumption data yet</p>
			{/if}
		</div>

		<!-- Today's Schedule -->
		<div class="card">
			<h2>Today's Schedule</h2>
			{#if todaySchedule.length > 0}
				<table>
					<thead>
						<tr>
							<th>Device</th>
							<th>Time</th>
						</tr>
					</thead>
					<tbody>
						{#each todaySchedule as schedule}
							<tr>
								<td>{schedule.device_name}</td>
								<td>{schedule.start_time} - {schedule.end_time}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p style="color: var(--gray-500);">No scheduled devices today</p>
			{/if}
		</div>
	</div>

	<!-- Consumption by Type -->
	{#if stats && stats.by_type.length > 0}
		<div class="card">
			<h2>Consumption by Type</h2>
			<div class="grid grid-3">
				{#each stats.by_type as typeData}
					<div class="stat">
						<div class="stat-value">{typeData.total_kwh.toFixed(1)}</div>
						<div class="stat-label">{typeData.type}</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/if}

<style>
	.text-sm {
		font-size: 0.875rem;
		color: var(--gray-600);
	}
</style>
