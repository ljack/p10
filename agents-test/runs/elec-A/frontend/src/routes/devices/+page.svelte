<script lang="ts">
	import { onMount } from 'svelte';
	import { deviceAPI } from '$lib/api';
	import type { Device } from '$lib/api';

	let devices = $state<Device[]>([]);
	let loading = $state(true);
	let showModal = $state(false);
	let editingDevice = $state<Device | null>(null);
	let filterType = $state('');
	let filterLocation = $state('');

	let formData = $state({
		name: '',
		type: 'appliance',
		wattage: 0,
		location: ''
	});

	const deviceTypes = ['lighting', 'heating', 'cooling', 'appliance', 'electronics', 'other'];

	onMount(async () => {
		await loadDevices();
	});

	async function loadDevices() {
		loading = true;
		try {
			devices = await deviceAPI.list();
		} catch (error) {
			console.error('Error loading devices:', error);
		} finally {
			loading = false;
		}
	}

	function openModal(device?: Device) {
		if (device) {
			editingDevice = device;
			formData = {
				name: device.name,
				type: device.type,
				wattage: device.wattage,
				location: device.location
			};
		} else {
			editingDevice = null;
			formData = {
				name: '',
				type: 'appliance',
				wattage: 0,
				location: ''
			};
		}
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingDevice = null;
	}

	async function handleSubmit() {
		try {
			if (editingDevice) {
				await deviceAPI.update(editingDevice.id, formData);
			} else {
				await deviceAPI.create(formData);
			}
			await loadDevices();
			closeModal();
		} catch (error: any) {
			alert('Error: ' + error.message);
		}
	}

	async function handleDelete(device: Device) {
		if (!confirm(`Delete ${device.name}?`)) return;

		try {
			await deviceAPI.delete(device.id);
			await loadDevices();
		} catch (error: any) {
			alert('Error: ' + error.message);
		}
	}

	const filteredDevices = $derived(devices.filter((d) => {
		if (filterType && d.type !== filterType) return false;
		if (filterLocation && d.location !== filterLocation) return false;
		return true;
	}));

	const locations = $derived([...new Set(devices.map((d) => d.location))]);
</script>

<div class="flex justify-between items-center mb-2">
	<h1>Devices</h1>
	<button class="btn btn-primary" on:click={() => openModal()}>+ Add Device</button>
</div>

<!-- Filters -->
<div class="card">
	<div class="flex gap-2">
		<div class="form-group" style="flex: 1;">
			<label for="filterType">Filter by Type</label>
			<select id="filterType" bind:value={filterType}>
				<option value="">All Types</option>
				{#each deviceTypes as type}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>
		<div class="form-group" style="flex: 1;">
			<label for="filterLocation">Filter by Location</label>
			<select id="filterLocation" bind:value={filterLocation}>
				<option value="">All Locations</option>
				{#each locations as location}
					<option value={location}>{location}</option>
				{/each}
			</select>
		</div>
	</div>
</div>

<!-- Devices Grid -->
{#if loading}
	<div class="card">
		<p>Loading...</p>
	</div>
{:else if filteredDevices.length === 0}
	<div class="card">
		<p style="color: var(--gray-500); text-align: center;">
			No devices found. Add one to get started!
		</p>
	</div>
{:else}
	<div class="grid grid-2">
		{#each filteredDevices as device}
			<div class="card">
				<div class="flex justify-between items-center mb-1">
					<h3 style="font-size: 1.125rem;">{device.name}</h3>
					<span class="badge badge-success">{device.recent_kwh?.toFixed(2) || 0} kWh</span>
				</div>
				<div style="color: var(--gray-600); font-size: 0.875rem;">
					<p>Type: <strong>{device.type}</strong></p>
					<p>Location: <strong>{device.location}</strong></p>
					<p>Wattage: <strong>{device.wattage}W</strong></p>
				</div>
				<div class="flex gap-1 mt-2">
					<button class="btn btn-secondary btn-sm" on:click={() => openModal(device)}
						>Edit</button
					>
					<button class="btn btn-danger btn-sm" on:click={() => handleDelete(device)}
						>Delete</button
					>
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Modal -->
{#if showModal}
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal" on:click|stopPropagation>
			<div class="modal-header">
				<h3>{editingDevice ? 'Edit Device' : 'Add Device'}</h3>
				<button class="btn btn-secondary btn-sm" on:click={closeModal}>✕</button>
			</div>

			<form on:submit|preventDefault={handleSubmit}>
				<div class="form-group">
					<label for="name">Name</label>
					<input id="name" type="text" bind:value={formData.name} required />
				</div>

				<div class="form-group">
					<label for="type">Type</label>
					<select id="type" bind:value={formData.type} required>
						{#each deviceTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="wattage">Wattage (W)</label>
					<input id="wattage" type="number" bind:value={formData.wattage} required min="1" />
				</div>

				<div class="form-group">
					<label for="location">Location</label>
					<input id="location" type="text" bind:value={formData.location} required />
				</div>

				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" on:click={closeModal}>Cancel</button>
					<button type="submit" class="btn btn-primary">
						{editingDevice ? 'Update' : 'Create'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
