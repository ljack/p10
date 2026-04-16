<script lang="ts">
	import { onMount } from 'svelte';
	import { getConsumptionStats, getBudgetStatus, getDevices, getTodaySchedules } from '$lib/api';

	let stats: any = $state(null);
	let budgetStatus: any = $state(null);
	let topDevices: any[] = $state([]);
	let todaySchedules: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const now = new Date();
			const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

			const [s, sched] = await Promise.all([
				getConsumptionStats({ period: 'month' }),
				getTodaySchedules()
			]);
			stats = s;
			todaySchedules = sched;

			// Sort by_device by consumption
			if (s.by_device) {
				topDevices = [...s.by_device].sort((a: any, b: any) => b.total_kwh - a.total_kwh).slice(0, 5);
			}

			try {
				budgetStatus = await getBudgetStatus(ym);
			} catch {
				// no budget set
			}
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	});

	function gaugeColor(pct: number): string {
		if (pct >= 90) return '#ef4444';
		if (pct >= 70) return '#f59e0b';
		return '#22c55e';
	}

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
</script>

<div class="page-header">
	<h1>Dashboard</h1>
	<span style="color: var(--text-muted)">Current Month Overview</span>
</div>

{#if loading}
	<p>Loading...</p>
{:else if error}
	<p style="color: var(--danger)">{error}</p>
{:else}
	<div class="grid-4" style="margin-bottom: 24px">
		<div class="card">
			<div class="stat-label">Total Consumption</div>
			<div class="stat-value">{stats?.total_kwh?.toFixed(1) ?? '0'}</div>
			<div class="stat-label">kWh this month</div>
		</div>
		<div class="card">
			<div class="stat-label">Estimated Cost</div>
			<div class="stat-value">€{stats?.total_cost?.toFixed(2) ?? '0'}</div>
			<div class="stat-label">this month</div>
		</div>
		<div class="card">
			<div class="stat-label">Daily Average</div>
			<div class="stat-value">{stats?.avg_daily_kwh?.toFixed(1) ?? '0'}</div>
			<div class="stat-label">kWh / day</div>
		</div>
		<div class="card">
			<div class="stat-label">Device Types</div>
			<div class="stat-value">{stats?.by_type?.length ?? 0}</div>
			<div class="stat-label">active categories</div>
		</div>
	</div>

	<div class="grid-2" style="margin-bottom: 24px">
		<!-- Budget Gauge -->
		<div class="card">
			<h3 style="margin-bottom: 12px">Budget Status</h3>
			{#if budgetStatus}
				<div style="display: flex; justify-content: space-between; margin-bottom: 4px">
					<span>{budgetStatus.used_kwh.toFixed(1)} kWh used</span>
					<span>{budgetStatus.budget_kwh} kWh budget</span>
				</div>
				<div class="gauge-bar">
					<div
						class="gauge-fill"
						style="width: {Math.min(budgetStatus.used_percent, 100)}%; background: {gaugeColor(budgetStatus.used_percent)}"
					></div>
				</div>
				<div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px; color: var(--text-muted)">
					<span>{budgetStatus.used_percent}% used</span>
					<span>Projected: {budgetStatus.projected_end_of_month_kwh.toFixed(1)} kWh</span>
				</div>
				{#if budgetStatus.is_over_threshold}
					<div class="badge badge-red" style="margin-top: 8px">⚠ Over {budgetStatus.alert_threshold_percent}% threshold!</div>
				{/if}
			{:else}
				<p style="color: var(--text-muted)">No budget set for this month. <a href="/budget">Set one →</a></p>
			{/if}
		</div>

		<!-- Today's Schedule -->
		<div class="card">
			<h3 style="margin-bottom: 12px">Today's Schedule</h3>
			{#if todaySchedules.length === 0}
				<p style="color: var(--text-muted)">No schedules for today.</p>
			{:else}
				<div style="max-height: 200px; overflow-y: auto">
					{#each todaySchedules as s}
						<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border)">
							<span>{s.device_name}</span>
							<span style="color: var(--text-muted)">{s.start_time} - {s.end_time}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Top Devices -->
	<div class="card">
		<h3 style="margin-bottom: 12px">Top 5 Consuming Devices</h3>
		{#if topDevices.length === 0}
			<p style="color: var(--text-muted)">No consumption data yet.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Device</th>
						<th>Type</th>
						<th>kWh</th>
						<th>Cost</th>
						<th>Share</th>
					</tr>
				</thead>
				<tbody>
					{#each topDevices as d}
						{@const share = stats.total_kwh > 0 ? (d.total_kwh / stats.total_kwh * 100).toFixed(1) : 0}
						<tr>
							<td>{d.device_name}</td>
							<td><span class="badge badge-blue">{d.device_type}</span></td>
							<td>{d.total_kwh.toFixed(1)}</td>
							<td>€{d.total_cost.toFixed(2)}</td>
							<td>
								<div style="display:flex;align-items:center;gap:8px">
									<div class="gauge-bar" style="width:100px">
										<div class="gauge-fill" style="width:{share}%;background:var(--primary)"></div>
									</div>
									<span style="font-size:13px">{share}%</span>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- By Type Breakdown -->
	{#if stats?.by_type?.length > 0}
		<div class="card" style="margin-top: 24px">
			<h3 style="margin-bottom: 12px">Consumption by Type</h3>
			<div class="grid-3">
				{#each stats.by_type as t}
					<div style="text-align:center;padding:12px">
						<div class="stat-value" style="font-size:22px">{t.total_kwh.toFixed(1)}</div>
						<div class="stat-label">{t.type} · €{t.total_cost.toFixed(2)}</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/if}
