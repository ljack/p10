<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();

	function isActive(path: string): boolean {
		if (path === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(path);
	}
</script>

<nav>
	<div class="nav-inner">
		<span class="logo">🐾 VetClinic</span>
		<a href="/" class:active={isActive('/')}>Dashboard</a>
		<a href="/pets" class:active={isActive('/pets')}>Pets</a>
		<a href="/treatments" class:active={isActive('/treatments')}>Treatments</a>
		<a href="/appointments" class:active={isActive('/appointments')}>Appointments</a>
		<a href="/book" class:active={isActive('/book')}>Book</a>
	</div>
</nav>

<main class="container">
	{@render children()}
</main>
