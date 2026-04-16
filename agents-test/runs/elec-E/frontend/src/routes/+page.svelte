<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/atoms/Card.svelte';
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
	import { fetchDevices, type Device } from '$lib/utils/api';
	
	let devices = $state<Device[]>([]);
	let loading = $state(true);
	
	onMount(async () => {
		try {
			devices = await fetchDevices();
		} catch (error) {
			console.error('Failed to load devices:', error);
		} finally {
			loading = false;
		}
	});
	
	const totalWattage = $derived(
		devices.filter(d => d.is_active).reduce((sum, d) => sum + d.wattage, 0)
	);
</script>

<svelte:head>
	<title>Dashboard - Electricity Consumption</title>
</svelte:head>

<div style="padding: {spacing.xl};">
	<h1 style="color: {colors.text}; margin-bottom: {spacing.lg};">Dashboard</h1>
	
	{#if loading}
		<p>Loading...</p>
	{:else}
		<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: {spacing.md}; margin-bottom: {spacing.xl};">
			<Card>
				<h2 style="font-size: 2rem; margin: 0; color: {colors.primary};">{devices.length}</h2>
				<p style="color: {colors.textSecondary}; margin: {spacing.xs} 0 0 0;">Total Devices</p>
			</Card>
			
			<Card>
				<h2 style="font-size: 2rem; margin: 0; color: {colors.success};">
					{devices.filter(d => d.is_active).length}
				</h2>
				<p style="color: {colors.textSecondary}; margin: {spacing.xs} 0 0 0;">Active Devices</p>
			</Card>
			
			<Card>
				<h2 style="font-size: 2rem; margin: 0; color: {colors.warning};">{totalWattage}W</h2>
				<p style="color: {colors.textSecondary}; margin: {spacing.xs} 0 0 0;">Total Capacity</p>
			</Card>
		</div>
		
		<Card>
			<h2 style="margin: 0 0 {spacing.md} 0;">Recent Devices</h2>
			<div style="display: flex; flex-direction: column; gap: {spacing.sm};">
				{#each devices.slice(0, 5) as device}
					<div style="padding: {spacing.sm}; border-bottom: 1px solid {colors.border};">
						<strong>{device.name}</strong>
						<span style="color: {colors.textSecondary}; margin-left: {spacing.md};">
							{device.location} • {device.wattage}W
						</span>
					</div>
				{/each}
			</div>
		</Card>
	{/if}
</div>
