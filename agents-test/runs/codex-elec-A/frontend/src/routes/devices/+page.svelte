<script lang="ts">
	import { onMount } from 'svelte';
	import DeviceFormModal from '$lib/components/DeviceFormModal.svelte';
	import { api } from '$lib/api';
	import type { Device } from '$lib/types';
	import { DEVICE_TYPES, formatKwh, humanizeDeviceType } from '$lib/utils';

	let devices: Device[] = [];
	let loading = true;
	let saving = false;
	let error = '';
	let modalOpen = false;
	let editingDevice: Device | null = null;

	let filters = {
		type: '',
		location: '',
		includeInactive: false
	};

	onMount(loadDevices);

	async function loadDevices() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			if (filters.type) params.set('type', filters.type);
			if (filters.location.trim()) params.set('location', filters.location.trim());
			if (filters.includeInactive) params.set('include_inactive', 'true');

			const query = params.toString();
			devices = await api.get<Device[]>(`/api/devices${query ? `?${query}` : ''}`);
		} catch (loadError) {
			error = loadError instanceof Error ? loadError.message : 'Unable to load devices';
		} finally {
			loading = false;
		}
	}

	function openNew() {
		editingDevice = null;
		modalOpen = true;
	}

	function openEdit(device: Device) {
		editingDevice = device;
		modalOpen = true;
	}

	async function handleSave(event: CustomEvent<{ name: string; type: string; wattage: number; location: string }>) {
		saving = true;
		error = '';

		try {
			if (editingDevice) {
				await api.put<Device>(`/api/devices/${editingDevice.id}`, event.detail);
			} else {
				await api.post<Device>('/api/devices', event.detail);
			}
			modalOpen = false;
			editingDevice = null;
			await loadDevices();
		} catch (saveError) {
			error = saveError instanceof Error ? saveError.message : 'Unable to save device';
		} finally {
			saving = false;
		}
	}

	async function deactivateDevice(device: Device) {
		if (!window.confirm(`Set "${device.name}" inactive? Existing consumption logs will be preserved.`)) {
			return;
		}

		try {
			await api.delete<void>(`/api/devices/${device.id}`);
			await loadDevices();
		} catch (deleteError) {
			error = deleteError instanceof Error ? deleteError.message : 'Unable to deactivate device';
		}
	}
</script>

<svelte:head>
	<title>Devices | Gridwise Home Energy</title>
</svelte:head>

<section class="panel fade-in">
	<div class="panel-inner stack">
		<div class="toolbar">
			<div class="section-title">
				<div>
					<h2>Devices</h2>
					<p>Filter, edit, and soft-delete equipment without losing history.</p>
				</div>
			</div>
			<button class="button" type="button" on:click={openNew}>Add device</button>
		</div>

		<form class="grid-3" on:submit|preventDefault={loadDevices}>
			<div class="field">
				<label for="type">Type</label>
				<select id="type" class="select" bind:value={filters.type}>
					<option value="">All types</option>
					{#each DEVICE_TYPES as type}
						<option value={type}>{humanizeDeviceType(type)}</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label for="location">Location</label>
				<input id="location" class="input" bind:value={filters.location} placeholder="Living room" />
			</div>

			<div class="field">
				<label for="inactive">Visibility</label>
				<div class="card toggle-card">
					<label class="checkbox">
						<input id="inactive" type="checkbox" bind:checked={filters.includeInactive} />
						<span>Include inactive devices</span>
					</label>
					<button class="button-secondary" type="submit">Apply filters</button>
				</div>
			</div>
		</form>

		{#if error}
			<div class="error">{error}</div>
		{/if}

		{#if loading}
			<div class="empty">Loading devices...</div>
		{:else if devices.length === 0}
			<div class="empty">No devices match the current filters.</div>
		{:else}
			<div class="grid-3">
				{#each devices as device}
					<article class="card device-card">
						<div class="device-head">
							<div>
								<h3>{device.name}</h3>
								<p class="muted">{device.location}</p>
							</div>
							<span class:warn={!device.is_active} class="pill">
								{device.is_active ? 'Active' : 'Inactive'}
							</span>
						</div>

						<div class="pill-row">
							<span class="tag">{humanizeDeviceType(device.type)}</span>
							<span class="tag">{device.wattage} W</span>
							<span class="tag">{formatKwh(device.current_month_kwh)}</span>
						</div>

						<div class="actions">
							<button class="button-secondary" type="button" on:click={() => openEdit(device)}>
								Edit
							</button>
							<button
								class="button-danger"
								type="button"
								on:click={() => deactivateDevice(device)}
								disabled={!device.is_active}
							>
								Deactivate
							</button>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>

<DeviceFormModal
	open={modalOpen}
	device={editingDevice}
	saving={saving}
	on:close={() => {
		modalOpen = false;
		editingDevice = null;
	}}
	on:save={handleSave}
/>

<style>
	.device-card {
		display: grid;
		gap: 16px;
	}

	.device-head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	h3,
	p {
		margin: 0;
	}

	.toggle-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
	}

	.checkbox {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--muted);
	}

	@media (max-width: 720px) {
		.device-head,
		.toggle-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
