<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<nav>
	<div class="container">
		<h1>⚡ ElectriHome</h1>
		<a href="/" class:active={$page.url.pathname === '/'}>Dashboard</a>
		<a href="/devices" class:active={$page.url.pathname === '/devices'}>Devices</a>
		<a href="/consumption" class:active={$page.url.pathname === '/consumption'}>Consumption</a>
		<a href="/schedules" class:active={$page.url.pathname === '/schedules'}>Schedules</a>
		<a href="/budget" class:active={$page.url.pathname === '/budget'}>Budget</a>
	</div>
</nav>

<main class="container">
	{@render children()}
</main>
