<script lang="ts">
	import { page } from '$app/stores';
	
	const navItems = [
		{ path: '/', label: 'Dashboard' },
		{ path: '/devices', label: 'Devices' },
		{ path: '/consumption', label: 'Consumption' },
		{ path: '/schedules', label: 'Schedules' },
		{ path: '/budget', label: 'Budget' }
	];
</script>

<div class="app">
	<nav>
		<div class="nav-container">
			<h1 class="logo">⚡ Home Electricity</h1>
			<ul class="nav-links">
				{#each navItems as item}
					<li>
						<a href={item.path} class:active={$page.url.pathname === item.path}>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</nav>

	<main>
		<slot />
	</main>

	<footer>
		<p>Home Electricity Consumption Tracker &copy; 2024</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #f0f0f0;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	nav {
		background: #007bff;
		color: white;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.nav-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		margin: 0;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.nav-links {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 2rem;
	}

	.nav-links a {
		color: white;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.nav-links a:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.nav-links a.active {
		background: rgba(255, 255, 255, 0.2);
		font-weight: bold;
	}

	main {
		flex: 1;
	}

	footer {
		background: #333;
		color: white;
		text-align: center;
		padding: 1rem;
		margin-top: 2rem;
	}

	footer p {
		margin: 0;
	}

	@media (max-width: 768px) {
		.nav-container {
			flex-direction: column;
			gap: 1rem;
		}

		.nav-links {
			flex-direction: column;
			gap: 0.5rem;
			width: 100%;
		}

		.nav-links a {
			text-align: center;
		}
	}
</style>
