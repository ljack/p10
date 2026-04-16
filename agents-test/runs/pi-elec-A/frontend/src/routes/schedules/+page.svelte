<script lang="ts">
	import { onMount } from 'svelte';
	import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getDevices } from '$lib/api';

	let schedules: any[] = $state([]);
	let devices: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showModal = $state(false);

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let form = $state({
		device_id: 0,
		day_of_week: 0,
		start_time: '09:00',
		end_time: '17:00',
		enabled: true
	});

	async function load() {
		try {
			const [s, d] = await Promise.all([getSchedules(), getDevices()]);
			schedules = s;
			devices = d;
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function deviceName(id: number): string {
		return devices.find((d) => d.id === id)?.name ?? `Device #${id}`;
	}

	function openCreate() {
		form = {
			device_id: devices[0]?.id ?? 0,
			day_of_week: 0,
			start_time: '09:00',
			end_time: '17:00',
			enabled: true
		};
		showModal = true;
	}

	async function handleSubmit() {
		try {
			await createSchedule(form);
			showModal = false;
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function toggleEnabled(s: any) {
		try {
			await updateSchedule(s.id, { enabled: !s.enabled });
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('Delete this schedule?')) return;
		try {
			await deleteSchedule(id);
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	// Group schedules by day for grid view
	let byDay = $derived(
		dayNames.map((name, i) => ({
			name,
			index: i,
			items: schedules
				.filter((s) => s.day_of_week === i)
				.sort((a, b) => a.start_time.localeCompare(b.start_time))
		}))
	);
</script>

<div class="page-header">
	<h1>Schedules</h1>
	<button class="btn-primary" onclick={openCreate}>+ Add Schedule</button>
</div>

{#if error}
	<p style="color:var(--danger);margin-bottom:12px">{error}</p>
{/if}

{#if loading}
	<p>Loading...</p>
{:else}
	<!-- Weekly Grid -->
	<div class="schedule-grid">
		{#each byDay as day}
			<div class="card" style="min-height:120px">
				<h4 style="margin-bottom:10px;color:var(--primary)">{day.name}</h4>
				{#if day.items.length === 0}
					<p style="font-size:13px;color:var(--text-muted)">No schedules</p>
				{:else}
					{#each day.items as s}
						<div class="schedule-item" class:disabled={!s.enabled}>
							<div style="display:flex;justify-content:space-between;align-items:center">
								<div>
									<div style="font-weight:600;font-size:13px">{deviceName(s.device_id)}</div>
									<div style="font-size:12px;color:var(--text-muted)">{s.start_time} - {s.end_time}</div>
								</div>
								<div style="display:flex;gap:4px;align-items:center">
									<button
										class="toggle-btn"
										class:active={s.enabled}
										onclick={() => toggleEnabled(s)}
										title={s.enabled ? 'Disable' : 'Enable'}
									>
										{s.enabled ? '●' : '○'}
									</button>
									<button class="btn-ghost" style="padding:2px 6px;font-size:11px" onclick={() => handleDelete(s.id)}>✕</button>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/each}
	</div>
{/if}

<!-- Modal -->
{#if showModal}
	<div class="modal-overlay" onclick={() => (showModal = false)} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<h2>Add Schedule</h2>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-group">
					<label for="device">Device</label>
					<select id="device" bind:value={form.device_id}>
						{#each devices as d}
							<option value={d.id}>{d.name}</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="dow">Day of Week</label>
					<select id="dow" bind:value={form.day_of_week}>
						{#each dayNames as name, i}
							<option value={i}>{name}</option>
						{/each}
					</select>
				</div>
				<div class="grid-2">
					<div class="form-group">
						<label for="start">Start Time</label>
						<input id="start" type="time" bind:value={form.start_time} required />
					</div>
					<div class="form-group">
						<label for="end">End Time</label>
						<input id="end" type="time" bind:value={form.end_time} required />
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn-ghost" onclick={() => (showModal = false)}>Cancel</button>
					<button type="submit" class="btn-primary">Create</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.schedule-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 12px;
	}
	@media (max-width: 1024px) {
		.schedule-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	@media (max-width: 640px) {
		.schedule-grid {
			grid-template-columns: 1fr;
		}
	}
	.schedule-item {
		padding: 8px;
		margin-bottom: 6px;
		background: rgba(59, 130, 246, 0.1);
		border-radius: 6px;
		border-left: 3px solid var(--primary);
	}
	.schedule-item.disabled {
		opacity: 0.5;
		border-left-color: var(--text-muted);
	}
	.toggle-btn {
		background: none;
		border: none;
		font-size: 16px;
		padding: 2px;
		color: var(--text-muted);
	}
	.toggle-btn.active {
		color: var(--success);
	}
</style>
