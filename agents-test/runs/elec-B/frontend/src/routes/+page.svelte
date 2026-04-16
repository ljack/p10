<script lang="ts">
    import { onMount } from 'svelte';
    import { api, type Stats, type BudgetStatus, type Schedule } from '$lib/api';

    let stats: Stats | null = null;
    let budgetStatus: BudgetStatus | null = null;
    let todaySchedule: Schedule[] = [];
    let loading = true;

    const currentMonth = new Date().toISOString().slice(0, 7);

    onMount(async () => {
        try {
            const [statsData, budgetData, scheduleData] = await Promise.all([
                api.consumption.stats({ period: 'month' }),
                api.budget.status(currentMonth).catch(() => null),
                api.schedules.today()
            ]);
            stats = statsData;
            budgetStatus = budgetData;
            todaySchedule = scheduleData;
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            loading = false;
        }
    });

    let usedPercent = $derived(budgetStatus ? budgetStatus.used_percent : 0);
    let progressClass = $derived(usedPercent >= 90 ? 'danger' : usedPercent >= 80 ? 'warning' : '');
</script>

<div class="container">
    <h1>Dashboard</h1>

    {#if loading}
        <p>Loading...</p>
    {:else if stats}
        <div class="grid">
            <div class="stat-card">
                <h3>{stats.total_kwh} kWh</h3>
                <p>Total Usage This Month</p>
            </div>
            <div class="stat-card">
                <h3>€{stats.total_cost}</h3>
                <p>Total Cost</p>
            </div>
            <div class="stat-card">
                <h3>{stats.avg_daily_kwh} kWh</h3>
                <p>Daily Average</p>
            </div>
        </div>

        {#if budgetStatus}
            <div class="card">
                <h2>Budget Status</h2>
                <div class="progress-bar">
                    <div class="progress-fill {progressClass}" style="width: {Math.min(usedPercent, 100)}%">
                        {usedPercent.toFixed(1)}%
                    </div>
                </div>
                <p>Used: {budgetStatus.used_kwh} kWh / {budgetStatus.budget_kwh} kWh</p>
                <p>Remaining: {budgetStatus.remaining_kwh} kWh</p>
                <p>Projected End of Month: {budgetStatus.projected_end_of_month_kwh} kWh</p>
                {#if budgetStatus.is_over_threshold}
                    <p style="color: #e74c3c; font-weight: bold; margin-top: 0.5rem">⚠️ Alert: Over threshold!</p>
                {/if}
            </div>
        {/if}

        <div class="card">
            <h2>Top 5 Consuming Devices</h2>
            <table>
                <thead>
                    <tr>
                        <th>Device</th>
                        <th>Usage (kWh)</th>
                        <th>Cost (€)</th>
                    </tr>
                </thead>
                <tbody>
                    {#each stats.by_device.slice(0, 5) as device}
                        <tr>
                            <td>{device.device_name}</td>
                            <td>{device.kwh.toFixed(2)}</td>
                            <td>{device.cost.toFixed(2)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>Today's Schedule</h2>
            {#if todaySchedule.length > 0}
                <table>
                    <thead>
                        <tr>
                            <th>Device</th>
                            <th>Type</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each todaySchedule as schedule}
                            <tr>
                                <td>{schedule.device_name}</td>
                                <td><span class="badge {schedule.device_type}">{schedule.device_type}</span></td>
                                <td>{schedule.start_time} - {schedule.end_time}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else}
                <p>No scheduled devices for today.</p>
            {/if}
        </div>
    {/if}
</div>
