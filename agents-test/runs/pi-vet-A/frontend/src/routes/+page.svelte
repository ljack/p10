<script lang="ts">
	import { onMount } from 'svelte';
	import { getPets, getAppointments, type Appointment } from '$lib/api';

	let totalPets = $state(0);
	let todayAppointments = $state<Appointment[]>([]);
	let upcomingCount = $state(0);
	let loading = $state(true);

	onMount(async () => {
		try {
			const today = new Date().toISOString().split('T')[0];
			const [pets, todayAppts, allAppts] = await Promise.all([
				getPets(),
				getAppointments({ date: today }),
				getAppointments({ status: 'scheduled' })
			]);
			totalPets = pets.length;
			todayAppointments = todayAppts.filter(a => a.status !== 'cancelled');
			upcomingCount = allAppts.length;
		} catch (e) {
			console.error(e);
		}
		loading = false;
	});

	function formatTime(dt: string): string {
		return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function badgeClass(status: string): string {
		return `badge badge-${status}`;
	}
</script>

<svelte:head><title>Dashboard – VetClinic</title></svelte:head>

<h1>Dashboard</h1>
<p style="color: var(--text-muted); margin-bottom: 1.5rem;">Welcome to VetClinic management system</p>

{#if loading}
	<p>Loading...</p>
{:else}
	<div class="stats-grid">
		<div class="stat-card">
			<div class="value">{totalPets}</div>
			<div class="label">Total Pets</div>
		</div>
		<div class="stat-card">
			<div class="value">{todayAppointments.length}</div>
			<div class="label">Today's Appointments</div>
		</div>
		<div class="stat-card">
			<div class="value">{upcomingCount}</div>
			<div class="label">Upcoming Scheduled</div>
		</div>
	</div>

	<div class="card">
		<h2>Today's Appointments</h2>
		{#if todayAppointments.length === 0}
			<p style="color: var(--text-muted); margin-top: 0.5rem;">No appointments today.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Time</th>
						<th>Pet</th>
						<th>Treatment</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each todayAppointments as appt}
						<tr>
							<td>{formatTime(appt.scheduled_at)}</td>
							<td>{appt.pet_name}</td>
							<td>{appt.treatment_name}</td>
							<td><span class={badgeClass(appt.status)}>{appt.status}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
{/if}
