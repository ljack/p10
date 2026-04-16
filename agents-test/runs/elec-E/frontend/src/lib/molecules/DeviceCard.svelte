<script lang="ts">
	import Card from '$lib/atoms/Card.svelte';
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
	
	interface DeviceCardProps {
		device: {
			id: number;
			name: string;
			type: string;
			wattage: number;
			location: string;
			is_active: boolean;
		};
	}
	
	let { device }: DeviceCardProps = $props();
</script>

<Card>
	<h3 style="margin: 0 0 {spacing.sm} 0; color: {colors.text};">{device.name}</h3>
	<div style="display: flex; gap: {spacing.md}; font-size: 0.875rem; color: {colors.textSecondary};">
		<span>📍 {device.location}</span>
		<span>⚡ {device.wattage}W</span>
		<span>{device.type}</span>
	</div>
	<div style="margin-top: {spacing.sm};">
		<span style="
			display: inline-block;
			padding: {spacing.xs} {spacing.sm};
			background-color: {device.is_active ? colors.success : colors.danger};
			color: white;
			border-radius: 0.25rem;
			font-size: 0.75rem;
		">
			{device.is_active ? 'Active' : 'Inactive'}
		</span>
	</div>
</Card>
