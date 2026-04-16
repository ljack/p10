<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type Appointment } from '$lib/api';
	
	let appointments = $state<Appointment[]>([]);
	let loading = $state(true);
	let stats = $state({ total: 0, today: 0, scheduled: 0 });
	
	onMount(async () => {
		try {
			const allAppointments = await api.appointments.getAll();
			appointments = allAppointments;
			
			const today = new Date().toISOString().split('T')[0];
			const todayAppointments = await api.appointments.getAll({ date: today });
			const scheduledAppointments = await api.appointments.getAll({ status: 'scheduled' });
			
			stats = {
				total: allAppointments.length,
				today: todayAppointments.length,
				scheduled: scheduledAppointments.length
			};
			
			// Get today's appointments for display
			appointments = todayAppointments.slice(0, 5);
		} catch (error) {
			console.error('Failed to load dashboard:', error);
		} finally {
			loading = false;
		}
	});
	
	function formatDateTime(datetime: string): string {
		return new Date(datetime).toLocaleString();
	}
</script>

<svelte:head>
	<title>Dashboard - Vet Clinic</title>
</svelte:head>

<h1>Dashboard</h1>

{#if loading}
	<p>Loading...</p>
{:else}
	<div class="stats">
		<div class="stat-card">
			<h3>{stats.today}</h3>
			<p>Today's Appointments</p>
		</div>
		<div class="stat-card">
			<h3>{stats.scheduled}</h3>
			<p>Scheduled Appointments</p>
		</div>
		<div class="stat-card">
			<h3>{stats.total}</h3>
			<p>Total Appointments</p>
		</div>
	</div>
	
	<div class="card">
		<h2>Today's Appointments</h2>
		{#if appointments.length === 0}
			<p>No appointments scheduled for today.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Time</th>
						<th>Pet ID</th>
						<th>Treatment ID</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each appointments as appointment}
						<tr>
							<td>{formatDateTime(appointment.scheduled_at)}</td>
							<td>{appointment.pet_id}</td>
							<td>{appointment.treatment_id}</td>
							<td>
								<span class="status status-{appointment.status}">{appointment.status}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
{/if}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}
	
	.stat-card {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		text-align: center;
	}
	
	.stat-card h3 {
		margin: 0;
		font-size: 2.5rem;
		color: #3498db;
	}
	
	.stat-card p {
		margin: 0.5rem 0 0 0;
		color: #7f8c8d;
	}
	
	.status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.875rem;
	}
	
	.status-scheduled {
		background: #3498db;
		color: white;
	}
	
	.status-in-progress {
		background: #f39c12;
		color: white;
	}
	
	.status-completed {
		background: #27ae60;
		color: white;
	}
	
	.status-cancelled {
		background: #95a5a6;
		color: white;
	}
</style>
