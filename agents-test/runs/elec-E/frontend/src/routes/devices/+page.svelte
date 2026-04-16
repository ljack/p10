<script lang="ts">
	import { onMount } from 'svelte';
	import DeviceList from '$lib/organisms/DeviceList.svelte';
	import Button from '$lib/atoms/Button.svelte';
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
	import { fetchDevices, type Device } from '$lib/utils/api';
	
	let devices = $state<Device[]>([]);
	let loading = $state(true);
	let filter = $state('');
	
	onMount(async () => {
		try {
			devices = await fetchDevices();
		} catch (error) {
			console.error('Failed to load devices:', error);
		} finally {
			loading = false;
		}
	});
	
	const filteredDevices = $derived(
		filter
			? devices.filter(d => 
				d.name.toLowerCase().includes(filter.toLowerCase()) ||
				d.location.toLowerCase().includes(filter.toLowerCase()) ||
				d.type.toLowerCase().includes(filter.toLowerCase())
			)
			: devices
	);
</script>

<svelte:head>
	<title>Devices - Electricity Consumption</title>
</svelte:head>

<div style="padding: {spacing.xl};">
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: {spacing.lg};">
		<h1 style="color: {colors.text}; margin: 0;">Devices</h1>
		<Button variant="primary">Add Device</Button>
	</div>
	
	<input
		type="text"
		bind:value={filter}
		placeholder="Filter devices..."
		style="
			width: 100%;
			max-width: 400px;
			padding: {spacing.sm} {spacing.md};
			border: 1px solid {colors.border};
			border-radius: 0.375rem;
			margin-bottom: {spacing.lg};
		"
	/>
	
	{#if loading}
		<p>Loading devices...</p>
	{:else if filteredDevices.length === 0}
		<p style="color: {colors.textSecondary};">No devices found.</p>
	{:else}
		<DeviceList devices={filteredDevices} />
	{/if}
</div>
