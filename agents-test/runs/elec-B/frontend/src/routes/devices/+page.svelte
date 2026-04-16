<script lang="ts">
    import { onMount } from 'svelte';
    import { api, type Device } from '$lib/api';

    let devices: Device[] = [];
    let loading = true;
    let showModal = false;
    let editingDevice: Device | null = null;
    let formData = {
        name: '',
        type: 'appliance',
        wattage: 0,
        location: ''
    };

    const deviceTypes = ['lighting', 'heating', 'cooling', 'appliance', 'electronics', 'other'];

    onMount(loadDevices);

    async function loadDevices() {
        loading = true;
        try {
            devices = await api.devices.list();
        } catch (error) {
            console.error('Failed to load devices:', error);
        } finally {
            loading = false;
        }
    }

    function openModal(device?: Device) {
        if (device) {
            editingDevice = device;
            formData = {
                name: device.name,
                type: device.type,
                wattage: device.wattage,
                location: device.location
            };
        } else {
            editingDevice = null;
            formData = { name: '', type: 'appliance', wattage: 0, location: '' };
        }
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        editingDevice = null;
    }

    async function handleSubmit() {
        try {
            if (editingDevice) {
                await api.devices.update(editingDevice.id, formData);
            } else {
                await api.devices.create(formData);
            }
            closeModal();
            loadDevices();
        } catch (error) {
            console.error('Failed to save device:', error);
            alert('Failed to save device');
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this device?')) return;
        try {
            await api.devices.delete(id);
            loadDevices();
        } catch (error) {
            console.error('Failed to delete device:', error);
            alert('Failed to delete device');
        }
    }
</script>

<div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1>Devices</h1>
        <button on:click={() => openModal()}>Add Device</button>
    </div>

    {#if loading}
        <p>Loading...</p>
    {:else}
        <div class="card">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Wattage</th>
                        <th>Location</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each devices as device}
                        <tr>
                            <td>{device.name}</td>
                            <td><span class="badge {device.type}">{device.type}</span></td>
                            <td>{device.wattage}W</td>
                            <td>{device.location}</td>
                            <td>
                                <button class="secondary" on:click={() => openModal(device)}>Edit</button>
                                <button class="danger" on:click={() => handleDelete(device.id)}>Delete</button>
                            </td>
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
            <h2>{editingDevice ? 'Edit Device' : 'Add Device'}</h2>
            <form on:submit|preventDefault={handleSubmit}>
                <label>
                    Name
                    <input type="text" bind:value={formData.name} required />
                </label>
                <label>
                    Type
                    <select bind:value={formData.type} required>
                        {#each deviceTypes as type}
                            <option value={type}>{type}</option>
                        {/each}
                    </select>
                </label>
                <label>
                    Wattage
                    <input type="number" bind:value={formData.wattage} required min="1" />
                </label>
                <label>
                    Location
                    <input type="text" bind:value={formData.location} required />
                </label>
                <div class="button-group">
                    <button type="submit">Save</button>
                    <button type="button" class="secondary" on:click={closeModal}>Cancel</button>
                </div>
            </form>
        </div>
    </div>
{/if}
