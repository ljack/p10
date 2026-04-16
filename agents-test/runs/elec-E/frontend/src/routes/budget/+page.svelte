<script lang="ts">
	import Card from '$lib/atoms/Card.svelte';
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
</script>

<svelte:head>
	<title>Budget - Electricity Consumption</title>
</svelte:head>

<div style="padding: {spacing.xl};">
	<h1 style="color: {colors.text}; margin-bottom: {spacing.lg};">Budget Management</h1>
	
	<Card>
		<p>Budget tracking features coming soon.</p>
		<p style="color: {colors.textSecondary};">Set and monitor monthly electricity budgets.</p>
	</Card>
</div>
