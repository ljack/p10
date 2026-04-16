<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type Appointment } from '$lib/api';
	
	let appointments = $state<Appointment[]>([]);
	let loading = $state(true);
	let filterDate = $state('');
	let filterStatus = $state('');
	
	onMount(async () => {
		await loadAppointments();
	});
	
	async function loadAppointments() {
		loading = true;
		try {
			const filters: any = {};
			if (filterDate) filters.date = filterDate;
			if (filterStatus) filters.status = filterStatus;
			
			appointments = await api.appointments.getAll(filters);
		} catch (error) {
			console.error('Failed to load appointments:', error);
		} finally {
			loading = false;
		}
	}
	
	async function handleStatusChange(appointment: Appointment, newStatus: string) {
		try {
			await api.appointments.update(appointment.id!, {
				pet_id: appointment.pet_id,
				treatment_id: appointment.treatment_id,
				scheduled_at: appointment.scheduled_at,
				status: newStatus as any,
				notes: appointment.notes
			});
			await loadAppointments();
		} catch (error) {
			console.error('Failed to update status:', error);
			alert('Failed to update status');
		}
	}
	
	async function handleDelete(id: number) {
		if (!confirm('Are you sure you want to cancel this appointment?')) return;
		
		try {
			await api.appointments.delete(id);
			await loadAppointments();
		} catch (error) {
			console.error('Failed to delete appointment:', error);
			alert('Failed to cancel appointment');
		}
	}
	
	function formatDateTime(datetime: string): string {
		return new Date(datetime).toLocaleString();
	}
</script>

<svelte:head>
	<title>Appointments - Vet Clinic</title>
</svelte:head>

<h1>Appointments</h1>

<div class="filters card">
	<div class="form-group">
		<label for="filterDate">Filter by Date</label>
		<input
			type="date"
			id="filterDate"
			bind:value={filterDate}
			onchange={() => loadAppointments()}
		/>
	</div>
	
	<div class="form-group">
		<label for="filterStatus">Filter by Status</label>
		<select id="filterStatus" bind:value={filterStatus} onchange={() => loadAppointments()}>
			<option value="">All</option>
			<option value="scheduled">Scheduled</option>
			<option value="in-progress">In Progress</option>
			<option value="completed">Completed</option>
			<option value="cancelled">Cancelled</option>
		</select>
	</div>
	
	<button class="btn btn-primary" onclick={() => loadAppointments()}>Refresh</button>
</div>

<div class="card">
	{#if loading}
		<p>Loading appointments...</p>
	{:else if appointments.length === 0}
		<p>No appointments found.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Scheduled At</th>
					<th>Pet ID</th>
					<th>Treatment ID</th>
					<th>Status</th>
					<th>Notes</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each appointments as appointment}
					<tr>
						<td>{formatDateTime(appointment.scheduled_at)}</td>
						<td>{appointment.pet_id}</td>
						<td>{appointment.treatment_id}</td>
						<td>
							<select
								value={appointment.status}
								onchange={(e) => handleStatusChange(appointment, e.currentTarget.value)}
							>
								<option value="scheduled">Scheduled</option>
								<option value="in-progress">In Progress</option>
								<option value="completed">Completed</option>
								<option value="cancelled">Cancelled</option>
							</select>
						</td>
						<td>{appointment.notes || '-'}</td>
						<td>
							<button class="btn-small btn-danger" onclick={() => handleDelete(appointment.id!)}>
								Cancel
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.filters {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		margin-bottom: 1rem;
	}
	
	.filters .form-group {
		flex: 1;
		margin-bottom: 0;
	}
	
	.btn-small {
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	
	.btn-small.btn-danger {
		background: #e74c3c;
		color: white;
	}
	
	.btn-small.btn-danger:hover {
		background: #c0392b;
	}
</style>
