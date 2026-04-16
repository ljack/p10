<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="app">
	<nav>
		<h1>🏥 Vet Clinic</h1>
		<ul>
			<li><a href="/" class:active={$page.url.pathname === '/'}>Dashboard</a></li>
			<li><a href="/pets" class:active={$page.url.pathname.startsWith('/pets')}>Pets</a></li>
			<li><a href="/treatments" class:active={$page.url.pathname.startsWith('/treatments')}>Treatments</a></li>
			<li><a href="/appointments" class:active={$page.url.pathname.startsWith('/appointments')}>Appointments</a></li>
			<li><a href="/book" class:active={$page.url.pathname === '/book'}>Book Appointment</a></li>
		</ul>
	</nav>
	
	<main>
		<slot />
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
		background: #f5f5f5;
	}
	
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
	
	nav {
		background: #2c3e50;
		color: white;
		padding: 1rem 2rem;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}
	
	nav h1 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
	}
	
	nav ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		gap: 2rem;
	}
	
	nav a {
		color: #ecf0f1;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: background 0.2s;
	}
	
	nav a:hover {
		background: #34495e;
	}
	
	nav a.active {
		background: #3498db;
	}
	
	main {
		flex: 1;
		padding: 2rem;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
	}
	
	:global(.card) {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		margin-bottom: 1rem;
	}
	
	:global(.btn) {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		transition: background 0.2s;
	}
	
	:global(.btn-primary) {
		background: #3498db;
		color: white;
	}
	
	:global(.btn-primary:hover) {
		background: #2980b9;
	}
	
	:global(.btn-danger) {
		background: #e74c3c;
		color: white;
	}
	
	:global(.btn-danger:hover) {
		background: #c0392b;
	}
	
	:global(.form-group) {
		margin-bottom: 1rem;
	}
	
	:global(label) {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}
	
	:global(input, select, textarea) {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
	}
	
	:global(table) {
		width: 100%;
		border-collapse: collapse;
	}
	
	:global(th, td) {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #ddd;
	}
	
	:global(th) {
		background: #f8f9fa;
		font-weight: 600;
	}
</style>
