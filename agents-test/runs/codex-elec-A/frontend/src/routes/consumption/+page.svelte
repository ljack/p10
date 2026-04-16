<script lang="ts">
	import { onMount } from 'svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import { api } from '$lib/api';
	import type { ConsumptionLog, ConsumptionStats, Device } from '$lib/types';
	import {
		dayValueLabel,
		formatCurrency,
		formatDateTime,
		formatKwh,
		humanizeDeviceType,
		toDatetimeLocalValue
	} from '$lib/utils';

	let devices: Device[] = [];
	let logs: ConsumptionLog[] = [];
	let stats: ConsumptionStats | null = null;
	let loading = true;
	let submitting = false;
	let error = '';

	let form = {
		deviceId: '',
		startedAt: toDatetimeLocalValue(),
		durationMinutes: 60
	};

	let filters = {
		deviceId: '',
		from: '',
		to: '',
		period: 'month'
	};

	onMount(async () => {
		await loadDevices();
		await loadConsumption();
	});

	async function loadDevices() {
		devices = await api.get<Device[]>('/api/devices');
		if (!form.deviceId && devices[0]) {
			form.deviceId = String(devices[0].id);
		}
	}

	function buildQuery(includePeriod = false): string {
		const params = new URLSearchParams();
		if (filters.deviceId) params.set('device_id', filters.deviceId);
		if (filters.from) params.set('from', filters.from);
		if (filters.to) params.set('to', filters.to);
		if (includePeriod) params.set('period', filters.period);
		const query = params.toString();
		return query ? `?${query}` : '';
	}

	async function loadConsumption() {
		loading = true;
		error = '';

		try {
			const [logsResponse, statsResponse] = await Promise.all([
				api.get<ConsumptionLog[]>(`/api/consumption${buildQuery(false)}`),
				api.get<ConsumptionStats>(`/api/consumption/stats${buildQuery(true)}`)
			]);
			logs = logsResponse;
			stats = statsResponse;
		} catch (loadError) {
			error = loadError instanceof Error ? loadError.message : 'Unable to load consumption';
		} finally {
			loading = false;
		}
	}

	async function submitLog() {
		submitting = true;
		error = '';

		try {
			await api.post<ConsumptionLog>('/api/consumption', {
				device_id: Number(form.deviceId),
				started_at: new Date(form.startedAt).toISOString(),
				duration_minutes: Number(form.durationMinutes)
			});
			form.startedAt = toDatetimeLocalValue();
			form.durationMinutes = 60;
			await loadConsumption();
		} catch (submitError) {
			error = submitError instanceof Error ? submitError.message : 'Unable to save consumption log';
		} finally {
			submitting = false;
		}
	}

	$: chartPoints =
		stats?.daily_usage.map((item) => ({
			label: dayValueLabel(item.day),
			value: item.total_kwh
		})) ?? [];
</script>

<svelte:head>
	<title>Consumption | Gridwise Home Energy</title>
</svelte:head>

<section class="grid-2 fade-in">
	<div class="panel">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h2>Log consumption</h2>
					<p>Create new entries and let the backend calculate kWh automatically.</p>
				</div>
			</div>

			<form class="stack" on:submit|preventDefault={submitLog}>
				<div class="field">
					<label for="device">Device</label>
					<select id="device" class="select" bind:value={form.deviceId} required>
						{#each devices as device}
							<option value={device.id}>{device.name} · {device.location}</option>
						{/each}
					</select>
				</div>

				<div class="grid-2">
					<div class="field">
						<label for="startedAt">Started at</label>
						<input id="startedAt" class="input" type="datetime-local" bind:value={form.startedAt} required />
					</div>
					<div class="field">
						<label for="duration">Duration (minutes)</label>
						<input
							id="duration"
							class="input"
							type="number"
							min="1"
							max="1440"
							bind:value={form.durationMinutes}
							required
						/>
					</div>
				</div>

				<div class="actions">
					<button class="button" type="submit" disabled={submitting || !form.deviceId}>
						{submitting ? 'Saving...' : 'Save entry'}
					</button>
				</div>
			</form>
		</div>
	</div>

	<div class="panel">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h2>Usage snapshot</h2>
					<p>Period totals update as you adjust the history filters.</p>
				</div>
			</div>

			{#if stats}
				<div class="grid-3">
					<div class="card">
						<div class="muted">Total kWh</div>
						<h3>{formatKwh(stats.total_kwh)}</h3>
					</div>
					<div class="card">
						<div class="muted">Estimated cost</div>
						<h3>{formatCurrency(stats.total_cost)}</h3>
					</div>
					<div class="card">
						<div class="muted">Avg daily use</div>
						<h3>{formatKwh(stats.avg_daily_kwh)}</h3>
					</div>
				</div>
			{:else}
				<div class="empty">Stats will appear here once data loads.</div>
			{/if}
		</div>
	</div>
</section>

<section class="panel fade-in">
	<div class="panel-inner stack">
		<div class="section-title">
			<div>
				<h3>History filters</h3>
				<p>Filter logs and the trend chart by device or date range.</p>
			</div>
		</div>

		<form class="grid-4" on:submit|preventDefault={loadConsumption}>
			<div class="field">
				<label for="history-device">Device</label>
				<select id="history-device" class="select" bind:value={filters.deviceId}>
					<option value="">All devices</option>
					{#each devices as device}
						<option value={device.id}>{device.name}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<label for="history-from">From</label>
				<input id="history-from" class="input" type="date" bind:value={filters.from} />
			</div>
			<div class="field">
				<label for="history-to">To</label>
				<input id="history-to" class="input" type="date" bind:value={filters.to} />
			</div>
			<div class="field">
				<label for="period">Period preset</label>
				<div class="field-row">
					<select id="period" class="select" bind:value={filters.period}>
						<option value="day">Day</option>
						<option value="week">Week</option>
						<option value="month">Month</option>
					</select>
					<button class="button-secondary" type="submit">Refresh</button>
				</div>
			</div>
		</form>

		{#if error}
			<div class="error">{error}</div>
		{/if}

		<BarChart points={chartPoints} />
	</div>
</section>

<section class="panel fade-in">
	<div class="panel-inner stack">
		<div class="section-title">
			<div>
				<h3>Consumption history</h3>
				<p>Logged entries with device, duration, kWh, and estimated cost.</p>
			</div>
		</div>

		{#if loading}
			<div class="empty">Loading consumption history...</div>
		{:else if logs.length === 0}
			<div class="empty">No consumption logs match the current filters.</div>
		{:else}
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th>Started</th>
							<th>Device</th>
							<th>Type</th>
							<th>Duration</th>
							<th>Usage</th>
							<th>Cost</th>
						</tr>
					</thead>
					<tbody>
						{#each logs as log}
							<tr>
								<td>{formatDateTime(log.started_at)}</td>
								<td>{log.device.name}</td>
								<td>{humanizeDeviceType(log.device.type)}</td>
								<td>{log.duration_minutes} min</td>
								<td>{formatKwh(log.kwh)}</td>
								<td>{formatCurrency(log.estimated_cost)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
