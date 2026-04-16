<script lang="ts">
    import { onMount } from 'svelte';
    import { api, type ConsumptionLog, type Device } from '$lib/api';

    let logs: ConsumptionLog[] = [];
    let devices: Device[] = [];
    let loading = true;
    let showModal = false;
    let formData = {
        device_id: 0,
        started_at: new Date().toISOString().slice(0, 16),
        duration_minutes: 60
    };

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        try {
            [logs, devices] = await Promise.all([
                api.consumption.list(),
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

    function openModal() {
        formData = {
            device_id: devices[0]?.id || 0,
            started_at: new Date().toISOString().slice(0, 16),
            duration_minutes: 60
        };
        showModal = true;
    }

    function closeModal() {
        showModal = false;
    }

    async function handleSubmit() {
        try {
            await api.consumption.create(formData);
            closeModal();
            loadData();
        } catch (error) {
            console.error('Failed to log consumption:', error);
            alert('Failed to log consumption');
        }
    }
</script>

<div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1>Consumption Logs</h1>
        <button on:click={openModal}>Log Consumption</button>
    </div>

    {#if loading}
        <p>Loading...</p>
    {:else}
        <div class="card">
            <table>
                <thead>
                    <tr>
                        <th>Device</th>
                        <th>Started At</th>
                        <th>Duration (min)</th>
                        <th>kWh</th>
                        <th>Recorded At</th>
                    </tr>
                </thead>
                <tbody>
                    {#each logs as log}
                        <tr>
                            <td>{log.device_name}</td>
                            <td>{new Date(log.started_at).toLocaleString()}</td>
                            <td>{log.duration_minutes}</td>
                            <td>{log.kwh.toFixed(3)}</td>
                            <td>{new Date(log.recorded_at).toLocaleString()}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

{#if showModal}
    <div class="modal" on:click={closeModal}>
        <div class="modal-content" on:click|stopPropagation>
            <h2>Log Consumption</h2>
            <form on:submit|preventDefault={handleSubmit}>
                <label>
                    Device
                    <select bind:value={formData.device_id} required>
                        {#each devices as device}
                            <option value={device.id}>{device.name} ({device.wattage}W)</option>
                        {/each}
                    </select>
                </label>
                <label>
                    Started At
                    <input type="datetime-local" bind:value={formData.started_at} required />
                </label>
                <label>
                    Duration (minutes)
                    <input type="number" bind:value={formData.duration_minutes} required min="1" />
                </label>
                <div class="button-group">
                    <button type="submit">Log</button>
                    <button type="button" class="secondary" on:click={closeModal}>Cancel</button>
                </div>
            </form>
        </div>
    </div>
{/if}
