<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getConsumption,
		getConsumptionStats,
		createConsumption,
		getDevices
	} from '$lib/api';

	let logs: any[] = $state([]);
	let stats: any = $state(null);
	let devices: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showModal = $state(false);

	let filterDeviceId = $state('');
	let filterFrom = $state('');
	let filterTo = $state('');

	let form = $state({
		device_id: 0,
		started_at: '',
		duration_minutes: 60
	});

	// Daily chart data
	let dailyData: { date: string; kwh: number }[] = $state([]);

	async function load() {
		loading = true;
		try {
			const params: Record<string, string> = {};
			if (filterDeviceId) params.device_id = filterDeviceId;
			if (filterFrom) params.from = filterFrom;
			if (filterTo) params.to = filterTo;

			const statsParams: Record<string, string> = { period: 'month' };
			if (filterDeviceId) statsParams.device_id = filterDeviceId;
			if (filterFrom) statsParams.from = filterFrom;
			if (filterTo) statsParams.to = filterTo;

			const [l, s, d] = await Promise.all([
				getConsumption(params),
				getConsumptionStats(statsParams),
				getDevices()
			]);
			logs = l;
			stats = s;
			devices = d;

			// Build daily aggregation for chart
			const daily: Record<string, number> = {};
			for (const log of l) {
				const day = log.started_at.substring(0, 10);
				daily[day] = (daily[day] || 0) + log.kwh;
			}
			dailyData = Object.entries(daily)
				.map(([date, kwh]) => ({ date, kwh: Math.round(kwh * 100) / 100 }))
				.sort((a, b) => a.date.localeCompare(b.date))
				.slice(-14); // last 14 days
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function openLog() {
		const now = new Date();
		form = {
			device_id: devices[0]?.id ?? 0,
			started_at: now.toISOString().slice(0, 16),
			duration_minutes: 60
		};
		showModal = true;
	}

	async function handleSubmit() {
		try {
			await createConsumption({
				...form,
				started_at: form.started_at + ':00'
			});
			showModal = false;
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	function deviceName(id: number): string {
		return devices.find((d) => d.id === id)?.name ?? `Device #${id}`;
	}

	let maxKwh = $derived(Math.max(...dailyData.map((d) => d.kwh), 1));
</script>

<div class="page-header">
	<h1>Consumption</h1>
	<button class="btn-primary" onclick={openLog}>+ Log Consumption</button>
</div>

<!-- Filters -->
<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
	<select bind:value={filterDeviceId} onchange={load} style="width:auto">
		<option value="">All devices</option>
		{#each devices as d}
			<option value={String(d.id)}>{d.name}</option>
		{/each}
	</select>
	<input type="date" bind:value={filterFrom} onchange={load} style="width:auto" />
	<input type="date" bind:value={filterTo} onchange={load} style="width:auto" />
</div>

{#if error}
	<p style="color:var(--danger);margin-bottom:12px">{error}</p>
{/if}

{#if loading}
	<p>Loading...</p>
{:else}
	<!-- Stats Summary -->
	{#if stats}
		<div class="grid-3" style="margin-bottom:24px">
			<div class="card">
				<div class="stat-label">Total</div>
				<div class="stat-value">{stats.total_kwh.toFixed(1)}<span style="font-size:16px"> kWh</span></div>
			</div>
			<div class="card">
				<div class="stat-label">Cost</div>
				<div class="stat-value">€{stats.total_cost.toFixed(2)}</div>
			</div>
			<div class="card">
				<div class="stat-label">Daily Average</div>
				<div class="stat-value">{stats.avg_daily_kwh.toFixed(1)}<span style="font-size:16px"> kWh</span></div>
			</div>
		</div>
	{/if}

	<!-- Bar Chart -->
	{#if dailyData.length > 0}
		<div class="card" style="margin-bottom:24px">
			<h3 style="margin-bottom:16px">Daily Usage (Last 14 days)</h3>
			<div style="display:flex;align-items:flex-end;gap:4px;height:160px;padding-top:8px">
				{#each dailyData as d}
					{@const pct = (d.kwh / maxKwh) * 100}
					<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
						<span style="font-size:10px;color:var(--text-muted);margin-bottom:4px">{d.kwh.toFixed(1)}</span>
						<div
							style="width:100%;max-width:40px;height:{Math.max(pct, 2)}%;background:var(--primary);border-radius:4px 4px 0 0;min-height:4px"
						></div>
						<span style="font-size:10px;color:var(--text-muted);margin-top:4px;writing-mode:vertical-rl;transform:rotate(180deg);max-height:50px;overflow:hidden"
							>{d.date.slice(5)}</span
						>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Log Table -->
	<div class="card">
		<h3 style="margin-bottom:12px">Consumption Log</h3>
		<table>
			<thead>
				<tr>
					<th>Device</th>
					<th>Started At</th>
					<th>Duration</th>
					<th>kWh</th>
				</tr>
			</thead>
			<tbody>
				{#each logs as log}
					<tr>
						<td>{deviceName(log.device_id)}</td>
						<td>{log.started_at.replace('T', ' ').slice(0, 16)}</td>
						<td>{log.duration_minutes} min</td>
						<td>{log.kwh.toFixed(3)}</td>
					</tr>
				{/each}
				{#if logs.length === 0}
					<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No logs found</td></tr>
				{/if}
			</tbody>
		</table>
	</div>
{/if}

<!-- Log Modal -->
{#if showModal}
	<div class="modal-overlay" onclick={() => (showModal = false)} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<h2>Log Consumption</h2>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-group">
					<label for="device">Device</label>
					<select id="device" bind:value={form.device_id}>
						{#each devices as d}
							<option value={d.id}>{d.name} ({d.wattage}W)</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="started">Started At</label>
					<input id="started" type="datetime-local" bind:value={form.started_at} required />
				</div>
				<div class="form-group">
					<label for="duration">Duration (minutes)</label>
					<input id="duration" type="number" bind:value={form.duration_minutes} required min="1" />
				</div>
				<div class="form-actions">
					<button type="button" class="btn-ghost" onclick={() => (showModal = false)}>Cancel</button>
					<button type="submit" class="btn-primary">Log</button>
				</div>
			</form>
		</div>
	</div>
{/if}
