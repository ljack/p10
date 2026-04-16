<script lang="ts">
	import { onMount } from 'svelte';
	import { getAppointments, updateAppointment, deleteAppointment, type Appointment } from '$lib/api';

	let appointments = $state<Appointment[]>([]);
	let loading = $state(true);
	let filterDate = $state('');
	let filterStatus = $state('');

	async function load() {
		loading = true;
		try {
			const params: Record<string, string> = {};
			if (filterDate) params.date = filterDate;
			if (filterStatus) params.status = filterStatus;
			appointments = await getAppointments(params);
		} catch (e: any) {
			console.error(e);
		}
		loading = false;
	}

	onMount(load);

	function formatDateTime(dt: string): string {
		const d = new Date(dt);
		return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function badgeClass(status: string): string {
		return `badge badge-${status}`;
	}

	async function changeStatus(appt: Appointment, status: string) {
		try {
			await updateAppointment(appt.id, { status } as any);
			await load();
		} catch (e: any) {
			alert(e.message);
		}
	}

	async function remove(id: number) {
		if (!confirm('Delete this appointment?')) return;
		try {
			await deleteAppointment(id);
			await load();
		} catch (e: any) {
			alert(e.message);
		}
	}
</script>

<svelte:head><title>Appointments – VetClinic</title></svelte:head>

<div class="toolbar">
	<h1>Appointments</h1>
	<input type="date" bind:value={filterDate} onchange={load} />
	<select bind:value={filterStatus} onchange={load}>
		<option value="">All Statuses</option>
		<option value="scheduled">Scheduled</option>
		<option value="in-progress">In Progress</option>
		<option value="completed">Completed</option>
		<option value="cancelled">Cancelled</option>
	</select>
	<a href="/book" class="btn btn-primary">+ Book Appointment</a>
</div>

{#if loading}
	<p>Loading...</p>
{:else if appointments.length === 0}
	<div class="card"><p style="color: var(--text-muted);">No appointments found.</p></div>
{:else}
	<div class="card" style="padding: 0; overflow-x: auto;">
		<table>
			<thead>
				<tr>
					<th>Date/Time</th>
					<th>Pet</th>
					<th>Treatment</th>
					<th>Duration</th>
					<th>Price</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each appointments as appt}
					<tr>
						<td>{formatDateTime(appt.scheduled_at)}</td>
						<td>{appt.pet_name}</td>
						<td>{appt.treatment_name}</td>
						<td>{appt.treatment_duration} min</td>
						<td>${appt.treatment_price?.toFixed(2)}</td>
						<td><span class={badgeClass(appt.status)}>{appt.status}</span></td>
						<td>
							{#if appt.status === 'scheduled'}
								<button class="btn btn-sm btn-secondary" onclick={() => changeStatus(appt, 'in-progress')}>Start</button>
								<button class="btn btn-sm btn-danger" onclick={() => changeStatus(appt, 'cancelled')}>Cancel</button>
							{:else if appt.status === 'in-progress'}
								<button class="btn btn-sm btn-success" onclick={() => changeStatus(appt, 'completed')}>Complete</button>
							{/if}
							<button class="btn btn-sm btn-danger" onclick={() => remove(appt.id)}>Delete</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
