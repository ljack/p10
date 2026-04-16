<script lang="ts">
	import { page } from '$app/stores';
	
	let currentPath = $derived($page.url.pathname);
	
	function isActive(path: string): boolean {
		if (path === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(path);
	}
</script>

<div class="app">
	<nav class="navbar">
		<div class="nav-container">
			<a href="/" class="logo">🏥 Vet Clinic</a>
			<div class="nav-links">
				<a href="/" class="nav-link {isActive('/') && currentPath === '/' ? 'active' : ''}">
					Dashboard
				</a>
				<a href="/pets" class="nav-link {isActive('/pets') ? 'active' : ''}">
					Pets
				</a>
				<a href="/treatments" class="nav-link {isActive('/treatments') ? 'active' : ''}">
					Treatments
				</a>
				<a href="/appointments" class="nav-link {isActive('/appointments') ? 'active' : ''}">
					Appointments
				</a>
				<a href="/book" class="nav-link {isActive('/book') ? 'active' : ''} book-btn">
					Book Appointment
				</a>
			</div>
		</div>
	</nav>
	
	<main>
		<slot />
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #f3f4f6;
		color: #1f2937;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.navbar {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
	}

	.logo {
		font-size: 1.5rem;
		font-weight: bold;
		color: #1f2937;
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-links {
		display: flex;
		gap: 0.5rem;
	}

	.nav-link {
		padding: 0.75rem 1rem;
		color: #6b7280;
		text-decoration: none;
		font-weight: 500;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.nav-link:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	.nav-link.active {
		color: #3b82f6;
		background: #eff6ff;
	}

	.nav-link.book-btn {
		background: #3b82f6;
		color: white;
	}

	.nav-link.book-btn:hover {
		background: #2563eb;
	}

	.nav-link.book-btn.active {
		background: #1d4ed8;
	}

	main {
		flex: 1;
	}
</style>
