<script lang="ts">
	import Card from '$lib/atoms/Card.svelte';
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
</script>

<svelte:head>
	<title>Schedules - Electricity Consumption</title>
</svelte:head>

<div style="padding: {spacing.xl};">
	<h1 style="color: {colors.text}; margin-bottom: {spacing.lg};">Device Schedules</h1>
	
	<Card>
		<p>Schedule management features coming soon.</p>
		<p style="color: {colors.textSecondary};">Create and manage automated device schedules.</p>
	</Card>
</div>
