<script lang="ts">
	import { onMount } from 'svelte';
	import { consumption, devices } from '$lib/api';
	import type { Device, ConsumptionLog } from '$lib/types';

	let logs: ConsumptionLog[] = $state([]);
	let deviceList: Device[] = $state([]);
	let dailyStats: any[] = $state([]);
	let showModal = $state(false);
	let loading = $state(true);

	let newLog = $state({
		device_id: 0,
		started_at: '',
		duration_minutes: 0
	});

	let filterDeviceId = $state('');
	let filterFromDate = $state('');
	let filterToDate = $state('');

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		try {
			const [logsData, devicesData] = await Promise.all([
				consumption.list(),
				devices.list()
			]);
			logs = logsData.logs;
			deviceList = devicesData.devices;
			
			// Calculate daily stats for chart
			calculateDailyStats();
		} catch (error) {
			alert('Error loading data: ' + error);
		} finally {
			loading = false;
		}
	}

	function calculateDailyStats() {
		const grouped = new Map<string, number>();
		logs.forEach(log => {
			const date = log.started_at.split('T')[0];
			grouped.set(date, (grouped.get(date) || 0) + log.kwh);
		});
		
		dailyStats = Array.from(grouped.entries())
			.map(([date, kwh]) => ({ date, kwh }))
			.sort((a, b) => a.date.localeCompare(b.date))
			.slice(-14); // Last 14 days
	}

	async function applyFilters() {
		try {
			loading = true;
			const params: any = {};
			if (filterDeviceId) params.device_id = parseInt(filterDeviceId);
			if (filterFromDate) params.from_date = filterFromDate;
			if (filterToDate) params.to_date = filterToDate;
			
			const data = await consumption.list(params);
			logs = data.logs;
			calculateDailyStats();
		} catch (error) {
			alert('Error filtering logs: ' + error);
		} finally {
			loading = false;
		}
	}

	async function logConsumption() {
		try {
			await consumption.create({
				...newLog,
				started_at: new Date(newLog.started_at).toISOString()
			});
			
			showModal = false;
			newLog = { device_id: 0, started_at: '', duration_minutes: 0 };
			await loadData();
		} catch (error) {
			alert('Error logging consumption: ' + error);
		}
	}

	function getDeviceName(deviceId: number) {
		return deviceList.find(d => d.id === deviceId)?.name || 'Unknown';
	}

	const maxKwh = $derived(Math.max(...dailyStats.map(s => s.kwh), 1));
</script>

<div class="container">
	<div class="header">
		<h1>Consumption</h1>
		<button onclick={() => showModal = true} class="btn-primary">+ Log Consumption</button>
	</div>

	<div class="chart-section">
		<h2>Daily Usage (Last 14 Days)</h2>
		<div class="chart">
			{#each dailyStats as stat}
				<div class="bar-container">
					<div 
						class="bar" 
						style="height: {(stat.kwh / maxKwh) * 100}%"
						title="{stat.date}: {stat.kwh.toFixed(2)} kWh"
					></div>
					<div class="bar-label">{stat.date.slice(5)}</div>
					<div class="bar-value">{stat.kwh.toFixed(1)}</div>
				</div>
			{:else}
				<p>No data to display</p>
			{/each}
		</div>
	</div>

	<div class="filters">
		<select bind:value={filterDeviceId} onchange={applyFilters}>
			<option value="">All Devices</option>
			{#each deviceList as device}
				<option value={device.id.toString()}>{device.name}</option>
			{/each}
		</select>

		<input type="date" bind:value={filterFromDate} onchange={applyFilters} placeholder="From" />
		<input type="date" bind:value={filterToDate} onchange={applyFilters} placeholder="To" />
		
		{#if filterDeviceId || filterFromDate || filterToDate}
			<button onclick={() => { filterDeviceId = ''; filterFromDate = ''; filterToDate = ''; applyFilters(); }}>
				Clear Filters
			</button>
		{/if}
	</div>

	{#if loading}
		<p>Loading...</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Device</th>
					<th>Started At</th>
					<th>Duration (min)</th>
					<th>kWh</th>
					<th>Recorded</th>
				</tr>
			</thead>
			<tbody>
				{#each logs as log}
					<tr>
						<td>{getDeviceName(log.device_id)}</td>
						<td>{new Date(log.started_at).toLocaleString()}</td>
						<td>{log.duration_minutes}</td>
						<td>{log.kwh.toFixed(3)}</td>
						<td>{new Date(log.recorded_at).toLocaleString()}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5">No consumption logs</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

{#if showModal}
	<div class="modal-backdrop" onclick={() => showModal = false}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Log Consumption</h2>
			
			<form onsubmit={(e) => { e.preventDefault(); logConsumption(); }}>
				<label>
					Device:
					<select bind:value={newLog.device_id} required>
						<option value={0}>Select a device</option>
						{#each deviceList as device}
							<option value={device.id}>{device.name}</option>
						{/each}
					</select>
				</label>

				<label>
					Started At:
					<input type="datetime-local" bind:value={newLog.started_at} required />
				</label>

				<label>
					Duration (minutes):
					<input type="number" bind:value={newLog.duration_minutes} min="1" required />
				</label>

				<div class="modal-actions">
					<button type="submit" class="btn-primary">Log</button>
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

	.chart-section {
		margin-bottom: 2rem;
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
	}

	.chart {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		height: 200px;
		margin-top: 1rem;
		padding: 1rem 0;
	}

	.bar-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
	}

	.bar {
		width: 100%;
		background: #007bff;
		border-radius: 4px 4px 0 0;
		transition: background 0.2s;
		min-height: 2px;
	}

	.bar:hover {
		background: #0056b3;
	}

	.bar-label {
		font-size: 0.7rem;
		margin-top: 0.25rem;
		color: #666;
	}

	.bar-value {
		font-size: 0.7rem;
		font-weight: bold;
		color: #333;
	}

	.filters {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.filters select, .filters input {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.filters button {
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
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

	.modal input, .modal select {
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
