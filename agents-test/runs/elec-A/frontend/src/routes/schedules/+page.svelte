<script lang="ts">
	import { onMount } from 'svelte';
	import { scheduleAPI, deviceAPI } from '$lib/api';
	import type { Schedule, Device } from '$lib/api';

	let schedules = $state<Schedule[]>([]);
	let devices = $state<Device[]>([]);
	let loading = $state(true);
	let showModal = $state(false);
	let editingSchedule = $state<Schedule | null>(null);

	const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	let formData = $state({
		device_id: 0,
		day_of_week: 0,
		start_time: '09:00',
		end_time: '17:00',
		enabled: true
	});

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		try {
			const [schedulesData, devicesData] = await Promise.all([
				scheduleAPI.list(),
				deviceAPI.list()
			]);

			schedules = schedulesData;
			devices = devicesData;
		} catch (error) {
			console.error('Error loading data:', error);
		} finally {
			loading = false;
		}
	}

	function openModal(schedule?: Schedule) {
		if (schedule) {
			editingSchedule = schedule;
			formData = {
				device_id: schedule.device_id,
				day_of_week: schedule.day_of_week,
				start_time: schedule.start_time,
				end_time: schedule.end_time,
				enabled: schedule.enabled
			};
		} else {
			editingSchedule = null;
			formData = {
				device_id: devices[0]?.id || 0,
				day_of_week: 0,
				start_time: '09:00',
				end_time: '17:00',
				enabled: true
			};
		}
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingSchedule = null;
	}

	async function handleSubmit() {
		try {
			if (editingSchedule) {
				await scheduleAPI.update(editingSchedule.id, formData);
			} else {
				await scheduleAPI.create(formData);
			}
			await loadData();
			closeModal();
		} catch (error: any) {
			alert('Error: ' + error.message);
		}
	}

	async function handleDelete(schedule: Schedule) {
		if (!confirm(`Delete this schedule?`)) return;

		try {
			await scheduleAPI.delete(schedule.id);
			await loadData();
		} catch (error: any) {
			alert('Error: ' + error.message);
		}
	}

	async function toggleEnabled(schedule: Schedule) {
		try {
			await scheduleAPI.update(schedule.id, { enabled: !schedule.enabled });
			await loadData();
		} catch (error: any) {
			alert('Error: ' + error.message);
		}
	}

	// Group schedules by day
	const schedulesByDay = $derived(daysOfWeek.map((day, index) => ({
		day,
		dayIndex: index,
		schedules: schedules.filter((s) => s.day_of_week === index)
	})));
</script>

<div class="flex justify-between items-center mb-2">
	<h1>Schedules</h1>
	<button class="btn btn-primary" on:click={() => openModal()}>+ Add Schedule</button>
</div>

<!-- Weekly Grid View -->
{#if loading}
	<div class="card">
		<p>Loading...</p>
	</div>
{:else}
	<div class="grid grid-2">
		{#each schedulesByDay as { day, dayIndex, schedules: daySchedules }}
			<div class="card">
				<h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--gray-700);">{day}</h3>
				{#if daySchedules.length === 0}
					<p style="color: var(--gray-500); font-size: 0.875rem;">No schedules</p>
				{:else}
					<div style="display: flex; flex-direction: column; gap: 0.75rem;">
						{#each daySchedules as schedule}
							<div
								class="schedule-item"
								class:disabled={!schedule.enabled}
								style="padding: 0.75rem; background: var(--gray-50); border-radius: 6px; border-left: 3px solid {schedule.enabled
									? 'var(--primary)'
									: 'var(--gray-300)'};"
							>
								<div class="flex justify-between items-center">
									<div>
										<div style="font-weight: 500; font-size: 0.875rem;">
											{schedule.device_name}
										</div>
										<div style="color: var(--gray-600); font-size: 0.75rem;">
											{schedule.start_time} - {schedule.end_time}
										</div>
									</div>
									<div class="flex gap-1">
										<button
											class="btn btn-sm {schedule.enabled ? 'btn-secondary' : 'btn-primary'}"
											on:click={() => toggleEnabled(schedule)}
											title={schedule.enabled ? 'Disable' : 'Enable'}
										>
											{schedule.enabled ? '⏸' : '▶'}
										</button>
										<button
											class="btn btn-secondary btn-sm"
											on:click={() => openModal(schedule)}
											title="Edit"
										>
											✏️
										</button>
										<button
											class="btn btn-danger btn-sm"
											on:click={() => handleDelete(schedule)}
											title="Delete"
										>
											🗑️
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<!-- Modal -->
{#if showModal}
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal" on:click|stopPropagation>
			<div class="modal-header">
				<h3>{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</h3>
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
					<label for="dayOfWeek">Day of Week</label>
					<select id="dayOfWeek" bind:value={formData.day_of_week} required>
						{#each daysOfWeek as day, index}
							<option value={index}>{day}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="startTime">Start Time</label>
					<input id="startTime" type="time" bind:value={formData.start_time} required />
				</div>

				<div class="form-group">
					<label for="endTime">End Time</label>
					<input id="endTime" type="time" bind:value={formData.end_time} required />
				</div>

				<div class="form-group">
					<label>
						<input type="checkbox" bind:checked={formData.enabled} />
						Enabled
					</label>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" on:click={closeModal}>Cancel</button>
					<button type="submit" class="btn btn-primary">
						{editingSchedule ? 'Update' : 'Create'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.schedule-item.disabled {
		opacity: 0.6;
	}
</style>
