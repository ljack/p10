<script lang="ts">
	import { onMount } from 'svelte';
	import { getAppointments, type Appointment } from '$lib/api';

	let todayAppointments = $state<Appointment[]>([]);
	let loading = $state(true);
	let error = $state('');

	let stats = $derived({
		total: todayAppointments.length,
		scheduled: todayAppointments.filter(a => a.status === 'scheduled').length,
		inProgress: todayAppointments.filter(a => a.status === 'in-progress').length,
		completed: todayAppointments.filter(a => a.status === 'completed').length
	});

	onMount(async () => {
		try {
			const today = new Date().toISOString().split('T')[0];
			todayAppointments = await getAppointments({ date: today });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load appointments';
		} finally {
			loading = false;
		}
	});

	function formatTime(datetime: string): string {
		return new Date(datetime).toLocaleTimeString('en-US', { 
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
</script>

<div class="container">
	<h1>Dashboard</h1>
	
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-value">{stats.total}</div>
			<div class="stat-label">Total Today</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{stats.scheduled}</div>
			<div class="stat-label">Scheduled</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{stats.inProgress}</div>
			<div class="stat-label">In Progress</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{stats.completed}</div>
			<div class="stat-label">Completed</div>
		</div>
	</div>

	<h2>Today's Appointments</h2>

	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if todayAppointments.length === 0}
		<p>No appointments scheduled for today.</p>
	{:else}
		<div class="appointment-list">
			{#each todayAppointments as appointment}
				<div class="appointment-card">
					<div class="appointment-time">{formatTime(appointment.scheduled_at)}</div>
					<div class="appointment-details">
						<div class="appointment-pet">
							<strong>{appointment.pet.name}</strong>
							<span class="pet-species">({appointment.pet.species})</span>
						</div>
						<div class="appointment-treatment">{appointment.treatment.name}</div>
						<div class="appointment-owner">Owner: {appointment.pet.owner_name}</div>
					</div>
					<div class="appointment-status">
						<span class="status-badge {getStatusColor(appointment.status)}">
							{appointment.status}
						</span>
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

	h1 {
		font-size: 2rem;
		font-weight: bold;
		margin-bottom: 2rem;
		color: #1f2937;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 2rem 0 1rem;
		color: #374151;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		text-align: center;
	}

	.stat-value {
		font-size: 2.5rem;
		font-weight: bold;
		color: #3b82f6;
	}

	.stat-label {
		color: #6b7280;
		margin-top: 0.5rem;
		font-size: 0.875rem;
	}

	.appointment-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.appointment-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.appointment-time {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		min-width: 100px;
	}

	.appointment-details {
		flex: 1;
	}

	.appointment-pet {
		font-size: 1.125rem;
		margin-bottom: 0.25rem;
	}

	.pet-species {
		color: #6b7280;
		font-weight: normal;
	}

	.appointment-treatment {
		color: #3b82f6;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.appointment-owner {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.appointment-status {
		margin-left: auto;
	}

	.status-badge {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.error {
		color: #dc2626;
		padding: 1rem;
		background: #fee2e2;
		border-radius: 6px;
	}
</style>
