<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import type { Device, Schedule } from '$lib/types';
	import { DAY_LABELS, formatTime, humanizeDeviceType } from '$lib/utils';

	let devices: Device[] = [];
	let schedules: Schedule[] = [];
	let loading = true;
	let saving = false;
	let error = '';

	type ScheduleForm = {
		id: number | null;
		deviceId: string;
		dayOfWeek: string;
		startTime: string;
		endTime: string;
		enabled: boolean;
	};

	function emptyForm(): ScheduleForm {
		return {
			id: null,
			deviceId: devices[0] ? String(devices[0].id) : '',
			dayOfWeek: '0',
			startTime: '06:00',
			endTime: '07:00',
			enabled: true
		};
	}

	let form: ScheduleForm = emptyForm();

	onMount(loadPage);

	async function loadPage() {
		loading = true;
		error = '';

		try {
			const [devicesResponse, schedulesResponse] = await Promise.all([
				api.get<Device[]>('/api/devices'),
				api.get<Schedule[]>('/api/schedules')
			]);
			devices = devicesResponse;
			schedules = schedulesResponse;
			if (!form.deviceId && devices[0]) {
				form = emptyForm();
			}
		} catch (loadError) {
			error = loadError instanceof Error ? loadError.message : 'Unable to load schedules';
		} finally {
			loading = false;
		}
	}

	function editSchedule(schedule: Schedule) {
		form = {
			id: schedule.id,
			deviceId: String(schedule.device_id),
			dayOfWeek: String(schedule.day_of_week),
			startTime: formatTime(schedule.start_time),
			endTime: formatTime(schedule.end_time),
			enabled: schedule.enabled
		};
	}

	function resetForm() {
		form = emptyForm();
	}

	async function submitSchedule() {
		saving = true;
		error = '';

		const payload = {
			device_id: Number(form.deviceId),
			day_of_week: Number(form.dayOfWeek),
			start_time: form.startTime,
			end_time: form.endTime,
			enabled: form.enabled
		};

		try {
			if (form.id) {
				await api.put<Schedule>(`/api/schedules/${form.id}`, payload);
			} else {
				await api.post<Schedule>('/api/schedules', payload);
			}
			resetForm();
			await loadPage();
		} catch (submitError) {
			error = submitError instanceof Error ? submitError.message : 'Unable to save schedule';
		} finally {
			saving = false;
		}
	}

	async function toggleSchedule(schedule: Schedule) {
		try {
			await api.put<Schedule>(`/api/schedules/${schedule.id}`, {
				enabled: !schedule.enabled
			});
			await loadPage();
		} catch (toggleError) {
			error = toggleError instanceof Error ? toggleError.message : 'Unable to update schedule';
		}
	}

	async function removeSchedule(schedule: Schedule) {
		if (!window.confirm(`Delete the schedule for "${schedule.device.name}"?`)) {
			return;
		}

		try {
			await api.delete<void>(`/api/schedules/${schedule.id}`);
			if (form.id === schedule.id) {
				resetForm();
			}
			await loadPage();
		} catch (deleteError) {
			error = deleteError instanceof Error ? deleteError.message : 'Unable to delete schedule';
		}
	}

	$: groupedSchedules = DAY_LABELS.map((label, index) => ({
		label,
		index,
		items: schedules.filter((schedule) => schedule.day_of_week === index)
	}));
</script>

<svelte:head>
	<title>Schedules | Gridwise Home Energy</title>
</svelte:head>

<section class="grid-2 fade-in">
	<div class="panel">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h2>{form.id ? 'Edit schedule' : 'Create schedule'}</h2>
					<p>Multiple devices can overlap, so this view focuses on visibility rather than conflict blocking.</p>
				</div>
			</div>

			<form class="stack" on:submit|preventDefault={submitSchedule}>
				<div class="grid-2">
					<div class="field">
						<label for="device">Device</label>
						<select id="device" class="select" bind:value={form.deviceId} disabled={devices.length === 0}>
							{#each devices as device}
								<option value={device.id}>{device.name}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label for="day">Day</label>
						<select id="day" class="select" bind:value={form.dayOfWeek}>
							{#each DAY_LABELS as label, index}
								<option value={index}>{label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid-2">
					<div class="field">
						<label for="start">Start time</label>
						<input id="start" class="input" type="time" bind:value={form.startTime} required />
					</div>
					<div class="field">
						<label for="end">End time</label>
						<input id="end" class="input" type="time" bind:value={form.endTime} required />
					</div>
				</div>

				<label class="checkbox">
					<input type="checkbox" bind:checked={form.enabled} />
					<span>Schedule enabled</span>
				</label>

				<div class="actions">
					<button class="button" type="submit" disabled={saving || !form.deviceId}>
						{saving ? 'Saving...' : form.id ? 'Save schedule' : 'Create schedule'}
					</button>
					<button class="button-ghost" type="button" on:click={resetForm}>Reset</button>
				</div>
			</form>

			{#if error}
				<div class="error">{error}</div>
			{/if}
		</div>
	</div>

	<div class="panel">
		<div class="panel-inner stack">
			<div class="section-title">
				<div>
					<h2>Schedule notes</h2>
					<p>Use the weekly grid to see clustering and manually smooth peaks.</p>
				</div>
			</div>

			<div class="grid-2">
				<div class="card">
					<div class="muted">Enabled schedules</div>
					<h3>{schedules.filter((schedule) => schedule.enabled).length}</h3>
				</div>
				<div class="card">
					<div class="muted">Tracked devices</div>
					<h3>{devices.length}</h3>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="panel fade-in">
	<div class="panel-inner stack">
		<div class="section-title">
			<div>
				<h3>Weekly schedule grid</h3>
				<p>Device windows organized Monday through Sunday.</p>
			</div>
		</div>

		{#if loading}
			<div class="empty">Loading schedules...</div>
		{:else if schedules.length === 0}
			<div class="empty">No schedules yet. Add one from the editor above.</div>
		{:else}
			<div class="weekly-grid">
				{#each groupedSchedules as day}
					<section class="day-column">
						<header>
							<strong>{day.label}</strong>
							<span class="muted">{day.items.length} entries</span>
						</header>

						{#if day.items.length === 0}
							<div class="empty small">Nothing scheduled.</div>
						{:else}
							<div class="stack">
								{#each day.items as schedule}
									<article class="card schedule-card">
										<div class="stack compact">
											<div class="pill-row">
												<span class:warn={!schedule.enabled} class="pill">
													{schedule.enabled ? 'Enabled' : 'Paused'}
												</span>
												<span class="tag">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
											</div>
											<div>
												<strong>{schedule.device.name}</strong>
												<p class="muted">
													{schedule.device.location} · {humanizeDeviceType(schedule.device.type)}
												</p>
											</div>
										</div>
										<div class="actions">
											<button class="button-secondary" type="button" on:click={() => editSchedule(schedule)}>
												Edit
											</button>
											<button class="button-ghost" type="button" on:click={() => toggleSchedule(schedule)}>
												{schedule.enabled ? 'Pause' : 'Enable'}
											</button>
											<button class="button-danger" type="button" on:click={() => removeSchedule(schedule)}>
												Delete
											</button>
										</div>
									</article>
								{/each}
							</div>
						{/if}
					</section>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	.checkbox {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--muted);
	}

	.weekly-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(180px, 1fr));
		gap: 14px;
		overflow-x: auto;
		padding-bottom: 6px;
	}

	.day-column {
		min-height: 100%;
		padding: 14px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.58);
		border: 1px solid rgba(29, 43, 43, 0.08);
		display: grid;
		align-content: start;
		gap: 12px;
	}

	.day-column header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.schedule-card {
		display: grid;
		gap: 12px;
	}

	.compact {
		gap: 8px;
	}

	.small {
		padding: 12px;
		font-size: 0.9rem;
	}

	p {
		margin: 4px 0 0;
	}
</style>
