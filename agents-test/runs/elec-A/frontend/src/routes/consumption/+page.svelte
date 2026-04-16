<script lang="ts">
	import { onMount } from 'svelte';
	import { consumptionAPI, deviceAPI } from '$lib/api';
	import type { ConsumptionLog, Device } from '$lib/api';

	let logs = $state<ConsumptionLog[]>([]);
	let devices = $state<Device[]>([]);
	let loading = $state(true);
	let showModal = $state(false);

	let filterDeviceId = $state('');
	let filterFromDate = $state('');
	let filterToDate = $state('');

	let formData = $state({
		device_id: 0,
		started_at: '',
		duration_minutes: 0
	});

	onMount(async () => {
		await loadData();
		// Set default date to today
		const today = new Date().toISOString().slice(0, 16);
		formData.started_at = today;
	});

	async function loadData() {
		loading = true;
		try {
			const [logsData, devicesData] = await Promise.all([
				consumptionAPI.list({
					device_id: filterDeviceId ? parseInt(filterDeviceId) : undefined,
					from_date: filterFromDate || undefined,
					to_date: filterToDate || undefined
				}),
				deviceAPI.list()
			]);

			logs = logsData;
			devices = devicesData;
		} catch (error) {
			console.error('Error loading data:', error);
		} finally {
			loading = false;
		}
	}

	function openModal() {
		formData = {
			device_id: devices[0]?.id || 0,
			started_at: new Date().toISOString().slice(0, 16),
			duration_minutes: 0
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function handleSubmit() {
		try {
			await consumptionAPI.create(formData);
			await loadData();
			closeModal();
		} catch (error: any) {
			alert('Error: ' + error.message);
		}
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString();
	}

	async function applyFilters() {
		await loadData();
	}

	function clearFilters() {
		filterDeviceId = '';
		filterFromDate = '';
		filterToDate = '';
		loadData();
	}
</script>

<div class="flex justify-between items-center mb-2">
	<h1>Consumption History</h1>
	<button class="btn btn-primary" on:click={openModal}>+ Log Consumption</button>
</div>

<!-- Filters -->
<div class="card">
	<h2>Filters</h2>
	<div class="grid grid-3">
		<div class="form-group">
			<label for="filterDevice">Device</label>
			<select id="filterDevice" bind:value={filterDeviceId}>
				<option value="">All Devices</option>
				{#each devices as device}
					<option value={device.id}>{device.name}</option>
				{/each}
			</select>
		</div>
		<div class="form-group">
			<label for="filterFrom">From Date</label>
			<input id="filterFrom" type="date" bind:value={filterFromDate} />
		</div>
		<div class="form-group">
			<label for="filterTo">To Date</label>
			<input id="filterTo" type="date" bind:value={filterToDate} />
		</div>
	</div>
	<div class="flex gap-1">
		<button class="btn btn-primary btn-sm" on:click={applyFilters}>Apply Filters</button>
		<button class="btn btn-secondary btn-sm" on:click={clearFilters}>Clear</button>
	</div>
</div>

<!-- Consumption Logs -->
<div class="card">
	<h2>Recent Logs</h2>
	{#if loading}
		<p>Loading...</p>
	{:else if logs.length === 0}
		<p style="color: var(--gray-500);">No consumption logs found.</p>
	{:else}
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
						<td>{log.device_name}</td>
						<td>{formatDate(log.started_at)}</td>
						<td>{log.duration_minutes} min</td>
						<td>{log.kwh.toFixed(3)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<!-- Modal -->
{#if showModal}
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal" on:click|stopPropagation>
			<div class="modal-header">
				<h3>Log Consumption</h3>
				<button class="btn btn-secondary btn-sm" on:click={closeModal}>✕</button>
			</div>

			<form on:submit|preventDefault={handleSubmit}>
				<div class="form-group">
					<label for="device">Device</label>
					<select id="device" bind:value={formData.device_id} required>
						{#each devices as device}
							<option value={device.id}>{device.name}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="started">Started At</label>
					<input id="started" type="datetime-local" bind:value={formData.started_at} required />
				</div>

				<div class="form-group">
					<label for="duration">Duration (minutes)</label>
					<input
						id="duration"
						type="number"
						bind:value={formData.duration_minutes}
						required
						min="1"
					/>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" on:click={closeModal}>Cancel</button>
					<button type="submit" class="btn btn-primary">Log</button>
				</div>
			</form>
		</div>
	</div>
{/if}
