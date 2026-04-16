<script lang="ts">
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
	
	let { children } = $props();
</script>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, sans-serif;
		background-color: #f9fafb;
	}
	
	nav a {
		text-decoration: none;
		transition: color 0.2s;
	}
	
	nav a:hover {
		color: var(--primary-dark);
	}
</style>

<div style="min-height: 100vh;">
	<nav style="
		background-color: {colors.background};
		border-bottom: 1px solid {colors.border};
		padding: {spacing.md} {spacing.xl};
		display: flex;
		gap: {spacing.lg};
	">
		<a href="/" style="color: {colors.text}; font-weight: 600;">Dashboard</a>
		<a href="/devices" style="color: {colors.text}; font-weight: 600;">Devices</a>
		<a href="/consumption" style="color: {colors.text}; font-weight: 600;">Consumption</a>
		<a href="/schedules" style="color: {colors.text}; font-weight: 600;">Schedules</a>
		<a href="/budget" style="color: {colors.text}; font-weight: 600;">Budget</a>
	</nav>
	
	<main>
		{@render children()}
	</main>
</div>
