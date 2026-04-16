<script lang="ts">
	import { onMount } from 'svelte';
	import { schedules, devices } from '$lib/api';
	import type { Schedule, Device } from '$lib/types';

	let scheduleList: Schedule[] = $state([]);
	let deviceList: Device[] = $state([]);
	let showModal = $state(false);
	let editingSchedule: Partial<Schedule> | null = $state(null);
	let loading = $state(true);

	const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		try {
			const [schedulesData, devicesData] = await Promise.all([
				schedules.list(),
				devices.list()
			]);
			scheduleList = schedulesData.schedules;
			deviceList = devicesData.devices;
		} catch (error) {
			alert('Error loading data: ' + error);
		} finally {
			loading = false;
		}
	}

	function openAddModal() {
		editingSchedule = {
			device_id: 0,
			day_of_week: 0,
			start_time: '09:00',
			end_time: '17:00',
			enabled: true
		};
		showModal = true;
	}

	function openEditModal(schedule: Schedule) {
		editingSchedule = { ...schedule };
		showModal = true;
	}

	async function saveSchedule() {
		if (!editingSchedule) return;

		try {
			if (editingSchedule.id) {
				await schedules.update(editingSchedule.id, editingSchedule);
			} else {
				await schedules.create(editingSchedule);
			}
			showModal = false;
			editingSchedule = null;
			await loadData();
		} catch (error) {
			alert('Error saving schedule: ' + error);
		}
	}

	async function deleteSchedule(id: number) {
		if (!confirm('Are you sure you want to delete this schedule?')) return;

		try {
			await schedules.delete(id);
			await loadData();
		} catch (error) {
			alert('Error deleting schedule: ' + error);
		}
	}

	async function toggleSchedule(schedule: Schedule) {
		try {
			await schedules.update(schedule.id, { enabled: !schedule.enabled });
			await loadData();
		} catch (error) {
			alert('Error updating schedule: ' + error);
		}
	}

	function getDeviceName(deviceId: number) {
		return deviceList.find(d => d.id === deviceId)?.name || 'Unknown';
	}

	function getSchedulesForDay(day: number) {
		return scheduleList
			.filter(s => s.day_of_week === day)
			.sort((a, b) => a.start_time.localeCompare(b.start_time));
	}
</script>

<div class="container">
	<div class="header">
		<h1>Schedules</h1>
		<button onclick={openAddModal} class="btn-primary">+ Add Schedule</button>
	</div>

	{#if loading}
		<p>Loading...</p>
	{:else}
		<div class="weekly-grid">
			{#each daysOfWeek as day, index}
				<div class="day-column">
					<h3>{day}</h3>
					<div class="schedule-items">
						{#each getSchedulesForDay(index) as schedule}
							<div class="schedule-card" class:disabled={!schedule.enabled}>
								<div class="schedule-header">
									<strong>{getDeviceName(schedule.device_id)}</strong>
									<label class="toggle">
										<input 
											type="checkbox" 
											checked={schedule.enabled}
											onchange={() => toggleSchedule(schedule)}
										/>
										<span class="slider"></span>
									</label>
								</div>
								<div class="schedule-time">
									{schedule.start_time} - {schedule.end_time}
								</div>
								<div class="schedule-actions">
									<button onclick={() => openEditModal(schedule)} class="btn-small">Edit</button>
									<button onclick={() => deleteSchedule(schedule.id)} class="btn-small btn-danger">Delete</button>
								</div>
							</div>
						{:else}
							<p class="empty-day">No schedules</p>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showModal && editingSchedule}
	<div class="modal-backdrop" onclick={() => showModal = false}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>{editingSchedule.id ? 'Edit' : 'Add'} Schedule</h2>
			
			<form onsubmit={(e) => { e.preventDefault(); saveSchedule(); }}>
				<label>
					Device:
					<select bind:value={editingSchedule.device_id} required>
						<option value={0}>Select a device</option>
						{#each deviceList as device}
							<option value={device.id}>{device.name}</option>
						{/each}
					</select>
				</label>

				<label>
					Day of Week:
					<select bind:value={editingSchedule.day_of_week} required>
						{#each daysOfWeek as day, index}
							<option value={index}>{day}</option>
						{/each}
					</select>
				</label>

				<label>
					Start Time:
					<input type="time" bind:value={editingSchedule.start_time} required />
				</label>

				<label>
					End Time:
					<input type="time" bind:value={editingSchedule.end_time} required />
				</label>

				<label class="checkbox-label">
					<input type="checkbox" bind:checked={editingSchedule.enabled} />
					Enabled
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
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.weekly-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 1rem;
	}

	.day-column {
		background: white;
		border-radius: 8px;
		padding: 1rem;
		min-height: 300px;
	}

	.day-column h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: #333;
		border-bottom: 2px solid #007bff;
		padding-bottom: 0.5rem;
	}

	.schedule-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.schedule-card {
		background: #f5f5f5;
		padding: 0.75rem;
		border-radius: 4px;
		border-left: 3px solid #007bff;
	}

	.schedule-card.disabled {
		opacity: 0.5;
		border-left-color: #999;
	}

	.schedule-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.schedule-time {
		font-size: 0.85rem;
		color: #666;
		margin-bottom: 0.5rem;
	}

	.schedule-actions {
		display: flex;
		gap: 0.25rem;
	}

	.empty-day {
		color: #999;
		font-style: italic;
		font-size: 0.9rem;
	}

	.toggle {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 20px;
	}

	.toggle input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		transition: 0.3s;
		border-radius: 20px;
	}

	.slider:before {
		position: absolute;
		content: "";
		height: 14px;
		width: 14px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.3s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: #007bff;
	}

	input:checked + .slider:before {
		transform: translateX(20px);
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
		font-size: 0.8rem;
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

	.checkbox-label {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
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

	@media (max-width: 1024px) {
		.weekly-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@media (max-width: 768px) {
		.weekly-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
