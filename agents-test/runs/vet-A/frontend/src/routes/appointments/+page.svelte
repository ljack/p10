<script lang="ts">
    import { onMount } from 'svelte';
    import { getAppointments, updateAppointment, deleteAppointment, type Appointment } from '$lib/api';
    
    let appointments: Appointment[] = $state([]);
    let loading = $state(true);
    let error = $state('');
    let filterDate = $state('');
    let filterStatus = $state('');
    
    onMount(async () => {
        await loadAppointments();
    });
    
    async function loadAppointments() {
        try {
            loading = true;
            const filters: any = {};
            if (filterDate) filters.date = filterDate;
            if (filterStatus) filters.status = filterStatus;
            
            appointments = await getAppointments(filters);
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
    
    async function handleStatusChange(id: number, newStatus: string) {
        try {
            error = '';
            await updateAppointment(id, { status: newStatus });
            await loadAppointments();
        } catch (e: any) {
            error = e.message;
        }
    }
    
    async function handleCancel(id: number) {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;
        
        try {
            error = '';
            await deleteAppointment(id);
            await loadAppointments();
        } catch (e: any) {
            error = e.message;
        }
    }
    
    function formatDateTime(dateStr: string) {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { 
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    function getStatusColor(status: string) {
        const colors: Record<string, string> = {
            'scheduled': '#3498db',
            'in-progress': '#f39c12',
            'completed': '#2ecc71',
            'cancelled': '#95a5a6'
        };
        return colors[status] || '#95a5a6';
    }
</script>

<div>
    <h1>Appointments</h1>
    
    {#if error}
        <div class="error">{error}</div>
    {/if}
    
    <div class="card">
        <div class="filters">
            <div class="form-group" style="flex: 1">
                <label for="date">Filter by Date</label>
                <input 
                    type="date" 
                    id="date" 
                    bind:value={filterDate}
                    onchange={loadAppointments}
                />
            </div>
            
            <div class="form-group" style="flex: 1">
                <label for="status">Filter by Status</label>
                <select 
                    id="status" 
                    bind:value={filterStatus}
                    onchange={loadAppointments}
                >
                    <option value="">All</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            
            <div class="form-group" style="flex: 0">
                <label>&nbsp;</label>
                <button class="btn" onclick={() => { filterDate = ''; filterStatus = ''; loadAppointments(); }}>
                    Clear Filters
                </button>
            </div>
        </div>
    </div>
    
    <div class="card">
        <h2>All Appointments</h2>
        {#if loading}
            <p>Loading...</p>
        {:else if appointments.length === 0}
            <p>No appointments found.</p>
        {:else}
            <table>
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Pet</th>
                        <th>Owner</th>
                        <th>Treatment</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each appointments as appointment}
                        <tr>
                            <td>{formatDateTime(appointment.scheduled_at)}</td>
                            <td>{appointment.pet.name}</td>
                            <td>{appointment.pet.owner_name}</td>
                            <td>{appointment.treatment.name}</td>
                            <td>{appointment.treatment.duration_minutes} min</td>
                            <td>
                                <select 
                                    value={appointment.status}
                                    onchange={(e) => handleStatusChange(appointment.id, e.currentTarget.value)}
                                    style="background: {getStatusColor(appointment.status)}; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px;"
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </td>
                            <td>
                                <button 
                                    class="btn btn-sm btn-danger" 
                                    onclick={() => handleCancel(appointment.id)}
                                    disabled={appointment.status === 'cancelled'}
                                >
                                    Cancel
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>

<style>
    .filters {
        display: flex;
        gap: 1rem;
        align-items: flex-end;
    }
    
    :global(.btn-sm) {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
    }
    
    :global(.btn-sm:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
