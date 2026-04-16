<script lang="ts">
	import { onMount } from 'svelte';
	import Gauge from '$lib/components/Gauge.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import { api } from '$lib/api';
	import type { BudgetDetail, ConsumptionStats, Device, Schedule } from '$lib/types';
	import {
		currentYearMonth,
		dayValueLabel,
		formatCurrency,
		formatKwh,
		formatPercent,
		formatTime,
		humanizeDeviceType,
		monthLabel
	} from '$lib/utils';

	let loading = true;
	let error = '';
	let stats: ConsumptionStats | null = null;
	let budget: BudgetDetail | null = null;
	let devices: Device[] = [];
	let todaySchedules: Schedule[] = [];

	const activeMonth = currentYearMonth();

	onMount(loadDashboard);

	async function loadDashboard() {
		loading = true;
		error = '';

		try {
			const [statsResponse, devicesResponse, schedulesResponse] = await Promise.all([
				api.get<ConsumptionStats>('/api/consumption/stats?period=month'),
				api.get<Device[]>('/api/devices'),
				api.get<Schedule[]>('/api/schedules/today')
			]);

			stats = statsResponse;
			devices = devicesResponse;
			todaySchedules = schedulesResponse;

			try {
				budget = await api.get<BudgetDetail>(`/api/budget/${activeMonth}`);
			} catch (budgetError) {
				const message = budgetError instanceof Error ? budgetError.message : 'Unable to load budget';
				if (message !== 'Budget not found') {
					throw budgetError;
				}
				budget = null;
			}
		} catch (loadError) {
			error = loadError instanceof Error ? loadError.message : 'Unable to load dashboard';
		} finally {
			loading = false;
		}
	}

	$: topDevices = stats?.by_device.slice(0, 5) ?? [];
	$: chartPoints =
		stats?.daily_usage.map((item) => ({
			label: dayValueLabel(item.day),
			value: item.total_kwh
		})) ?? [];
</script>

<svelte:head>
	<title>Dashboard | Gridwise Home Energy</title>
</svelte:head>

<section class="hero fade-in">
	<div class="panel">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h2>Current month at a glance</h2>
					<p>{monthLabel(activeMonth)} performance, costs, and schedule pressure.</p>
				</div>
				<a class="button-ghost" href="/consumption">Log usage</a>
			</div>

			{#if error}
				<div class="error">{error}</div>
			{:else if loading}
				<div class="empty">Loading dashboard metrics...</div>
			{:else}
				<div class="grid-4">
					<StatCard
						title="Total usage"
						value={stats ? formatKwh(stats.total_kwh) : formatKwh(0)}
						subtitle="Current month total"
					/>
					<StatCard
						title="Estimated cost"
						value={stats ? formatCurrency(stats.total_cost) : formatCurrency(0)}
						subtitle="Based on monthly budget pricing"
						accent="teal"
					/>
					<StatCard
						title="Daily average"
						value={stats ? formatKwh(stats.avg_daily_kwh) : formatKwh(0)}
						subtitle="Average kWh per day"
						accent="teal"
					/>
					<StatCard
						title="Active devices"
						value={`${devices.length}`}
						subtitle="Trackable devices online"
						accent="coral"
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class="panel">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h2>Budget pulse</h2>
					<p>Threshold visibility for this month.</p>
				</div>
				<a class="button-ghost" href="/budget">Manage budget</a>
			</div>

			{#if loading}
				<div class="empty">Loading budget...</div>
			{:else if budget}
				<div class="stack">
					<Gauge
						label={`Budget for ${monthLabel(budget.year_month)}`}
						value={budget.used_kwh}
						max={budget.budget_kwh}
						threshold={budget.alert_threshold_percent / 100 * budget.budget_kwh}
						footer={`Projected end-of-month usage: ${formatKwh(budget.projected_end_of_month_kwh)}`}
					/>
					<div class="pill-row">
						<span class:warn={budget.is_over_threshold} class="pill">
							Used {formatPercent(budget.used_percent)}
						</span>
						<span class="pill">Remaining {formatKwh(budget.remaining_kwh)}</span>
					</div>
				</div>
			{:else}
				<div class="empty">
					No budget set for {monthLabel(activeMonth)} yet. Add one on the budget page to unlock cost
					and alert tracking.
				</div>
			{/if}
		</div>
	</div>
</section>

<section class="grid-2">
	<div class="panel fade-in">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h3>Top consuming devices</h3>
					<p>Highest energy demand this month.</p>
				</div>
				<a class="button-ghost" href="/devices">View devices</a>
			</div>

			{#if topDevices.length === 0}
				<div class="empty">No consumption data yet.</div>
			{:else}
				<div class="table-wrap">
					<table class="table">
						<thead>
							<tr>
								<th>Device</th>
								<th>Type</th>
								<th>Usage</th>
								<th>Cost</th>
							</tr>
						</thead>
						<tbody>
							{#each topDevices as item}
								<tr>
									<td>{item.name}</td>
									<td>{humanizeDeviceType(item.type)}</td>
									<td>{formatKwh(item.total_kwh)}</td>
									<td>{formatCurrency(item.total_cost)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>

	<div class="panel fade-in">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h3>Today's schedule</h3>
					<p>Automation windows active today.</p>
				</div>
				<a class="button-ghost" href="/schedules">Edit schedules</a>
			</div>

			{#if todaySchedules.length === 0}
				<div class="empty">No enabled schedules are set for today.</div>
			{:else}
				<div class="stack">
					{#each todaySchedules as schedule}
						<div class="card schedule-card">
							<div>
								<strong>{schedule.device.name}</strong>
								<p class="muted">{schedule.device.location}</p>
							</div>
							<div class="pill-row">
								<span class="tag">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
								<span class="tag">{humanizeDeviceType(schedule.device.type)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>

<section class="panel fade-in">
	<div class="panel-inner stack">
		<div class="section-title">
			<div>
				<h3>Daily usage trend</h3>
				<p>A quick read of how the month is stacking up day by day.</p>
			</div>
			<a class="button-ghost" href="/consumption">Open history</a>
		</div>

		<BarChart points={chartPoints} height={240} />
	</div>
</section>

<style>
	.schedule-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}

	p {
		margin: 4px 0 0;
	}

	@media (max-width: 720px) {
		.schedule-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
