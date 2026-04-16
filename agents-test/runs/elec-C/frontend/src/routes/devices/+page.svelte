<script lang="ts">
	import { onMount } from 'svelte';
	import { devices } from '$lib/api';
	import type { Device } from '$lib/types';

	let deviceList: Device[] = $state([]);
	let filteredDevices: Device[] = $state([]);
	let typeFilter = $state('');
	let locationFilter = $state('');
	let showModal = $state(false);
	let editingDevice: Partial<Device> | null = $state(null);
	let loading = $state(true);

	const deviceTypes = ['lighting', 'heating', 'cooling', 'appliance', 'electronics', 'other'];

	onMount(async () => {
		await loadDevices();
	});

	async function loadDevices() {
		try {
			const data = await devices.list();
			deviceList = data.devices;
			applyFilters();
		} catch (error) {
			alert('Error loading devices: ' + error);
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		filteredDevices = deviceList.filter(device => {
			if (typeFilter && device.type !== typeFilter) return false;
			if (locationFilter && device.location !== locationFilter) return false;
			return true;
		});
	}

	$effect(() => {
		typeFilter, locationFilter;
		applyFilters();
	});

	function openAddModal() {
		editingDevice = { name: '', type: 'appliance', wattage: 0, location: '' };
		showModal = true;
	}

	function openEditModal(device: Device) {
		editingDevice = { ...device };
		showModal = true;
	}

	async function saveDevice() {
		if (!editingDevice) return;

		try {
			if (editingDevice.id) {
				await devices.update(editingDevice.id, editingDevice);
			} else {
				await devices.create(editingDevice);
			}
			showModal = false;
			editingDevice = null;
			await loadDevices();
		} catch (error) {
			alert('Error saving device: ' + error);
		}
	}

	async function deleteDevice(id: number) {
		if (!confirm('Are you sure you want to delete this device?')) return;

		try {
			await devices.delete(id);
			await loadDevices();
		} catch (error) {
			alert('Error deleting device: ' + error);
		}
	}

	const uniqueLocations = $derived([...new Set(deviceList.map(d => d.location))].sort());
</script>

<div class="container">
	<div class="header">
		<h1>Devices</h1>
		<button onclick={openAddModal} class="btn-primary">+ Add Device</button>
	</div>

	<div class="filters">
		<select bind:value={typeFilter}>
			<option value="">All Types</option>
			{#each deviceTypes as type}
				<option value={type}>{type}</option>
			{/each}
		</select>

		<select bind:value={locationFilter}>
			<option value="">All Locations</option>
			{#each uniqueLocations as location}
				<option value={location}>{location}</option>
			{/each}
		</select>
	</div>

	{#if loading}
		<p>Loading...</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Type</th>
					<th>Wattage</th>
					<th>Location</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredDevices as device}
					<tr>
						<td>{device.name}</td>
						<td><span class="badge">{device.type}</span></td>
						<td>{device.wattage}W</td>
						<td>{device.location}</td>
						<td>
							<button onclick={() => openEditModal(device)} class="btn-small">Edit</button>
							<button onclick={() => deleteDevice(device.id)} class="btn-small btn-danger">Delete</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5">No devices found</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

{#if showModal && editingDevice}
	<div class="modal-backdrop" onclick={() => showModal = false}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>{editingDevice.id ? 'Edit' : 'Add'} Device</h2>
			
			<form onsubmit={(e) => { e.preventDefault(); saveDevice(); }}>
				<label>
					Name:
					<input type="text" bind:value={editingDevice.name} required />
				</label>

				<label>
					Type:
					<select bind:value={editingDevice.type} required>
						{#each deviceTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</label>

				<label>
					Wattage (W):
					<input type="number" bind:value={editingDevice.wattage} min="1" required />
				</label>

				<label>
					Location:
					<input type="text" bind:value={editingDevice.location} required />
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

	.filters {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.filters select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
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

	.badge {
		background: #e0e0e0;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.85rem;
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
		margin-right: 0.25rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-small:hover {
		background: #f5f5f5;
	}

	.btn-danger {
		color: #dc3545;
		border-color: #dc3545;
	}

	.btn-danger:hover {
		background: #dc3545;
		color: white;
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
