<script lang="ts">
	import DeviceCard from '$lib/molecules/DeviceCard.svelte';
	import { spacing } from '$lib/tokens/spacing';
	
	interface DeviceListProps {
		devices: Array<{
			id: number;
			name: string;
			type: string;
			wattage: number;
			location: string;
			is_active: boolean;
		}>;
	}
	
	let { devices }: DeviceListProps = $props();
</script>

<div style="
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: {spacing.md};
">
	{#each devices as device (device.id)}
		<DeviceCard {device} />
	{/each}
</div>
