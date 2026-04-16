<script lang="ts">
	import { onMount } from 'svelte';
	import { getDevices, createDevice, updateDevice, deleteDevice } from '$lib/api';

	let devices: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showModal = $state(false);
	let editingDevice: any = $state(null);
	let filterType = $state('');
	let filterLocation = $state('');

	const deviceTypes = ['lighting', 'heating', 'cooling', 'appliance', 'electronics', 'other'];
	const typeBadge: Record<string, string> = {
		lighting: 'badge-yellow',
		heating: 'badge-red',
		cooling: 'badge-blue',
		appliance: 'badge-purple',
		electronics: 'badge-green',
		other: 'badge-gray'
	};

	let form = $state({
		name: '',
		type: 'appliance',
		wattage: 0,
		location: ''
	});

	async function load() {
		try {
			const params: Record<string, string> = {};
			if (filterType) params.type = filterType;
			if (filterLocation) params.location = filterLocation;
			devices = await getDevices(params);
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function openCreate() {
		editingDevice = null;
		form = { name: '', type: 'appliance', wattage: 0, location: '' };
		showModal = true;
	}

	function openEdit(d: any) {
		editingDevice = d;
		form = { name: d.name, type: d.type, wattage: d.wattage, location: d.location };
		showModal = true;
	}

	async function handleSubmit() {
		try {
			if (editingDevice) {
				await updateDevice(editingDevice.id, form);
			} else {
				await createDevice(form);
			}
			showModal = false;
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('Deactivate this device?')) return;
		try {
			await deleteDevice(id);
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	let locations = $derived([...new Set(devices.map((d) => d.location))].sort());
</script>

<div class="page-header">
	<h1>Devices</h1>
	<button class="btn-primary" onclick={openCreate}>+ Add Device</button>
</div>

<!-- Filters -->
<div style="display:flex;gap:12px;margin-bottom:20px">
	<select bind:value={filterType} onchange={load} style="width:auto">
		<option value="">All types</option>
		{#each deviceTypes as t}
			<option value={t}>{t}</option>
		{/each}
	</select>
	<select bind:value={filterLocation} onchange={load} style="width:auto">
		<option value="">All locations</option>
		{#each locations as loc}
			<option value={loc}>{loc}</option>
		{/each}
	</select>
</div>

{#if error}
	<p style="color:var(--danger);margin-bottom:12px">{error}</p>
{/if}

{#if loading}
	<p>Loading...</p>
{:else}
	<div class="card">
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
				{#each devices as d}
					<tr>
						<td><strong>{d.name}</strong></td>
						<td><span class="badge {typeBadge[d.type] ?? 'badge-gray'}">{d.type}</span></td>
						<td>{d.wattage}W</td>
						<td>{d.location}</td>
						<td>
							<button class="btn-ghost" style="padding:4px 10px;font-size:13px" onclick={() => openEdit(d)}>Edit</button>
							<button class="btn-danger" style="padding:4px 10px;font-size:13px" onclick={() => handleDelete(d.id)}>Delete</button>
						</td>
					</tr>
				{/each}
				{#if devices.length === 0}
					<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No devices found</td></tr>
				{/if}
			</tbody>
		</table>
	</div>
{/if}

<!-- Modal -->
{#if showModal}
	<div class="modal-overlay" onclick={() => (showModal = false)} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<h2>{editingDevice ? 'Edit Device' : 'Add Device'}</h2>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-group">
					<label for="name">Name</label>
					<input id="name" bind:value={form.name} required placeholder="e.g. Living Room AC" />
				</div>
				<div class="form-group">
					<label for="type">Type</label>
					<select id="type" bind:value={form.type}>
						{#each deviceTypes as t}
							<option value={t}>{t}</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="wattage">Wattage (W)</label>
					<input id="wattage" type="number" bind:value={form.wattage} required min="1" />
				</div>
				<div class="form-group">
					<label for="location">Location</label>
					<input id="location" bind:value={form.location} required placeholder="e.g. Kitchen" />
				</div>
				<div class="form-actions">
					<button type="button" class="btn-ghost" onclick={() => (showModal = false)}>Cancel</button>
					<button type="submit" class="btn-primary">{editingDevice ? 'Update' : 'Create'}</button>
				</div>
			</form>
		</div>
	</div>
{/if}
