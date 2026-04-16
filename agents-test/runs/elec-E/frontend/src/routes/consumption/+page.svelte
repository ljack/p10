<script lang="ts">
	import Card from '$lib/atoms/Card.svelte';
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
</script>

<svelte:head>
	<title>Consumption - Electricity Consumption</title>
</svelte:head>

<div style="padding: {spacing.xl};">
	<h1 style="color: {colors.text}; margin-bottom: {spacing.lg};">Consumption Tracking</h1>
	
	<Card>
		<p>Consumption tracking features coming soon.</p>
		<p style="color: {colors.textSecondary};">Log and view electricity consumption history.</p>
	</Card>
</div>
