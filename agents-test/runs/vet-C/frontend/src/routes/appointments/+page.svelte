<script lang="ts">
	import { onMount } from 'svelte';
	import { getAppointments, updateAppointment, deleteAppointment, type Appointment } from '$lib/api';

	let appointments = $state<Appointment[]>([]);
	let loading = $state(true);
	let error = $state('');
	
	let filters = $state({
		date: '',
		status: ''
	});

	onMount(() => loadAppointments());

	async function loadAppointments() {
		try {
			loading = true;
			error = '';
			const params: any = {};
			if (filters.date) params.date = filters.date;
			if (filters.status) params.status = filters.status;
			appointments = await getAppointments(params);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load appointments';
		} finally {
			loading = false;
		}
	}

	async function handleStatusChange(id: number, newStatus: string) {
		try {
			error = '';
			await updateAppointment(id, { status: newStatus });
			await loadAppointments();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update appointment';
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('Are you sure you want to delete this appointment?')) return;
		try {
			error = '';
			await deleteAppointment(id);
			await loadAppointments();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete appointment';
		}
	}

	function formatDateTime(datetime: string): string {
		const date = new Date(datetime);
		return date.toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric', 
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			'scheduled': 'bg-blue-100 text-blue-800',
			'in-progress': 'bg-yellow-100 text-yellow-800',
			'completed': 'bg-green-100 text-green-800',
			'cancelled': 'bg-gray-100 text-gray-800'
		};
		return colors[status] || 'bg-gray-100 text-gray-800';
	}

	function setToday() {
		filters.date = new Date().toISOString().split('T')[0];
		loadAppointments();
	}

	function clearFilters() {
		filters.date = '';
		filters.status = '';
		loadAppointments();
	}
</script>

<div class="container">
	<div class="header">
		<h1>Appointments</h1>
		<a href="/book" class="btn-primary">Book Appointment</a>
	</div>

	<div class="filters">
		<div class="filter-group">
			<label for="date">Date</label>
			<input type="date" id="date" bind:value={filters.date} oninput={() => loadAppointments()} />
		</div>
		<div class="filter-group">
			<label for="status">Status</label>
			<select id="status" bind:value={filters.status} onchange={() => loadAppointments()}>
				<option value="">All</option>
				<option value="scheduled">Scheduled</option>
				<option value="in-progress">In Progress</option>
				<option value="completed">Completed</option>
				<option value="cancelled">Cancelled</option>
			</select>
		</div>
		<div class="filter-actions">
			<button class="btn-secondary" onclick={setToday}>Today</button>
			<button class="btn-secondary" onclick={clearFilters}>Clear</button>
		</div>
	</div>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if loading}
		<p>Loading...</p>
	{:else if appointments.length === 0}
		<p>No appointments found. Try adjusting the filters or book a new appointment.</p>
	{:else}
		<div class="appointments-list">
			{#each appointments as appointment}
				<div class="appointment-card">
					<div class="appointment-main">
						<div class="appointment-datetime">
							{formatDateTime(appointment.scheduled_at)}
						</div>
						<div class="appointment-details">
							<div class="detail-row">
								<strong>{appointment.pet.name}</strong>
								<span class="species">({appointment.pet.species})</span>
							</div>
							<div class="detail-row treatment">
								{appointment.treatment.name}
								<span class="duration">({appointment.treatment.duration_minutes} min)</span>
							</div>
							<div class="detail-row owner">
								Owner: {appointment.pet.owner_name} • {appointment.pet.owner_phone}
							</div>
							{#if appointment.notes}
								<div class="detail-row notes">
									Notes: {appointment.notes}
								</div>
							{/if}
						</div>
					</div>
					<div class="appointment-actions">
						<select
							class="status-select {getStatusColor(appointment.status)}"
							value={appointment.status}
							onchange={(e) => handleStatusChange(appointment.id, (e.target as HTMLSelectElement).value)}
						>
							<option value="scheduled">Scheduled</option>
							<option value="in-progress">In Progress</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
						</select>
						<button class="btn-danger-small" onclick={() => handleDelete(appointment.id)}>Delete</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

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

	h1 {
		font-size: 2rem;
		font-weight: bold;
		color: #1f2937;
	}

	.filters {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.filter-group input,
	.filter-group select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
		min-width: 150px;
	}

	.filter-actions {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
	}

	.appointments-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.appointment-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.appointment-main {
		flex: 1;
		display: flex;
		gap: 1.5rem;
	}

	.appointment-datetime {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		min-width: 180px;
	}

	.appointment-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-row {
		font-size: 0.875rem;
		color: #374151;
	}

	.detail-row strong {
		font-size: 1rem;
		color: #1f2937;
	}

	.species {
		color: #6b7280;
		margin-left: 0.25rem;
	}

	.treatment {
		color: #3b82f6;
		font-weight: 500;
	}

	.duration {
		color: #6b7280;
		font-weight: normal;
	}

	.owner {
		color: #6b7280;
	}

	.notes {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #e5e7eb;
		color: #6b7280;
		font-style: italic;
	}

	.appointment-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-end;
	}

	.status-select {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		cursor: pointer;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		text-decoration: none;
		display: inline-block;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.btn-danger-small {
		background: #ef4444;
		color: white;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.btn-danger-small:hover {
		background: #dc2626;
	}

	.error {
		color: #dc2626;
		padding: 1rem;
		background: #fee2e2;
		border-radius: 6px;
		margin-bottom: 1rem;
	}
</style>
