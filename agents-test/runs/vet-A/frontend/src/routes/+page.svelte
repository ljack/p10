<script lang="ts">
    import { onMount } from 'svelte';
    import { getAppointments, type Appointment } from '$lib/api';
    
    let appointments: Appointment[] = $state([]);
    let loading = $state(true);
    let error = $state('');
    
    onMount(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            appointments = await getAppointments({ date: today });
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    });
    
    let todayStats = $derived({
        total: appointments.length,
        scheduled: appointments.filter(a => a.status === 'scheduled').length,
        inProgress: appointments.filter(a => a.status === 'in-progress').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length
    });
    
    function formatTime(dateStr: string) {
        return new Date(dateStr).toLocaleTimeString('en-US', { 
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
    <h1>Dashboard</h1>
    
    {#if error}
        <div class="error">{error}</div>
    {/if}
    
    <div class="stats">
        <div class="stat-card">
            <h3>Total Appointments</h3>
            <p class="stat-number">{todayStats.total}</p>
        </div>
        <div class="stat-card">
            <h3>Scheduled</h3>
            <p class="stat-number" style="color: #3498db">{todayStats.scheduled}</p>
        </div>
        <div class="stat-card">
            <h3>In Progress</h3>
            <p class="stat-number" style="color: #f39c12">{todayStats.inProgress}</p>
        </div>
        <div class="stat-card">
            <h3>Completed</h3>
            <p class="stat-number" style="color: #2ecc71">{todayStats.completed}</p>
        </div>
    </div>
    
    <div class="card">
        <h2>Today's Appointments</h2>
        {#if loading}
            <p>Loading...</p>
        {:else if appointments.length === 0}
            <p>No appointments scheduled for today.</p>
        {:else}
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Pet</th>
                        <th>Owner</th>
                        <th>Treatment</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {#each appointments as appointment}
                        <tr>
                            <td>{formatTime(appointment.scheduled_at)}</td>
                            <td>{appointment.pet.name}</td>
                            <td>{appointment.pet.owner_name}</td>
                            <td>{appointment.treatment.name}</td>
                            <td>
                                <span 
                                    class="status-badge" 
                                    style="background: {getStatusColor(appointment.status)}"
                                >
                                    {appointment.status}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>

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
    }
    
    .stat-card h3 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: #7f8c8d;
        text-transform: uppercase;
    }
    
    .stat-number {
        margin: 0;
        font-size: 2.5rem;
        font-weight: bold;
        color: #2c3e50;
    }
    
    .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        color: white;
        font-size: 0.85rem;
        font-weight: 500;
    }
</style>
