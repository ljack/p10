<script lang="ts">
    import { onMount } from 'svelte';
    import { api, type Schedule, type Device } from '$lib/api';

    let schedules: Schedule[] = [];
    let devices: Device[] = [];
    let loading = true;
    let showModal = false;
    let editingSchedule: Schedule | null = null;
    let formData = {
        device_id: 0,
        day_of_week: 0,
        start_time: '08:00',
        end_time: '17:00'
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    onMount(loadData);

    async function loadData() {
        loading = true;
        try {
            [schedules, devices] = await Promise.all([
                api.schedules.list(),
                api.devices.list()
            ]);
            if (devices.length > 0 && formData.device_id === 0) {
                formData.device_id = devices[0].id;
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            loading = false;
        }
    }

    function openModal(schedule?: Schedule) {
        if (schedule) {
            editingSchedule = schedule;
            formData = {
                device_id: schedule.device_id,
                day_of_week: schedule.day_of_week,
                start_time: schedule.start_time,
                end_time: schedule.end_time
            };
        } else {
            editingSchedule = null;
            formData = {
                device_id: devices[0]?.id || 0,
                day_of_week: 0,
                start_time: '08:00',
                end_time: '17:00'
            };
        }
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        editingSchedule = null;
    }

    async function handleSubmit() {
        try {
            if (editingSchedule) {
                await api.schedules.update(editingSchedule.id, {
                    day_of_week: formData.day_of_week,
                    start_time: formData.start_time,
                    end_time: formData.end_time
                });
            } else {
                await api.schedules.create(formData);
            }
            closeModal();
            loadData();
        } catch (error) {
            console.error('Failed to save schedule:', error);
            alert('Failed to save schedule');
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this schedule?')) return;
        try {
            await api.schedules.delete(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete schedule:', error);
            alert('Failed to delete schedule');
        }
    }

    async function toggleEnabled(schedule: Schedule) {
        try {
            await api.schedules.update(schedule.id, { enabled: !schedule.enabled });
            loadData();
        } catch (error) {
            console.error('Failed to toggle schedule:', error);
        }
    }

    let schedulesByDay = $derived(schedules.reduce((acc, s) => {
        if (!acc[s.day_of_week]) acc[s.day_of_week] = [];
        acc[s.day_of_week].push(s);
        return acc;
    }, {} as Record<number, Schedule[]>));
</script>

<div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1>Schedules</h1>
        <button on:click={() => openModal()}>Add Schedule</button>
    </div>

    {#if loading}
        <p>Loading...</p>
    {:else}
        <div class="grid">
            {#each days as day, index}
                <div class="card">
                    <h2>{day}</h2>
                    {#if schedulesByDay[index]}
                        {#each schedulesByDay[index] as schedule}
                            <div style="padding: 0.5rem; margin: 0.5rem 0; background: #f8f9fa; border-radius: 4px;">
                                <strong>{schedule.device_name}</strong><br>
                                {schedule.start_time} - {schedule.end_time}
                                <div style="margin-top: 0.5rem;">
                                    <button class="secondary" style="font-size: 0.875rem; padding: 0.25rem 0.5rem;" 
                                            on:click={() => toggleEnabled(schedule)}>
                                        {schedule.enabled ? 'Disable' : 'Enable'}
                                    </button>
                                    <button class="secondary" style="font-size: 0.875rem; padding: 0.25rem 0.5rem;" 
                                            on:click={() => openModal(schedule)}>
                                        Edit
                                    </button>
                                    <button class="danger" style="font-size: 0.875rem; padding: 0.25rem 0.5rem;" 
                                            on:click={() => handleDelete(schedule.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        {/each}
                    {:else}
                        <p style="color: #999;">No schedules</p>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

{#if showModal}
    <div class="modal" on:click={closeModal}>
        <div class="modal-content" on:click|stopPropagation>
            <h2>{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</h2>
            <form on:submit|preventDefault={handleSubmit}>
                <label>
                    Device
                    <select bind:value={formData.device_id} required disabled={editingSchedule !== null}>
                        {#each devices as device}
                            <option value={device.id}>{device.name}</option>
                        {/each}
                    </select>
                </label>
                <label>
                    Day
                    <select bind:value={formData.day_of_week} required>
                        {#each days as day, index}
                            <option value={index}>{day}</option>
                        {/each}
                    </select>
                </label>
                <label>
                    Start Time
                    <input type="time" bind:value={formData.start_time} required />
                </label>
                <label>
                    End Time
                    <input type="time" bind:value={formData.end_time} required />
                </label>
                <div class="button-group">
                    <button type="submit">Save</button>
                    <button type="button" class="secondary" on:click={closeModal}>Cancel</button>
                </div>
            </form>
        </div>
    </div>
{/if}
