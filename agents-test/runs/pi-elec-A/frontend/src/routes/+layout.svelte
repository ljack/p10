<script lang="ts">
	import '../app.css';
	let { children } = $props();

	const navItems = [
		{ href: '/', label: '⚡ Dashboard' },
		{ href: '/devices', label: '🔌 Devices' },
		{ href: '/consumption', label: '📊 Consumption' },
		{ href: '/schedules', label: '📅 Schedules' },
		{ href: '/budget', label: '💰 Budget' }
	];
</script>

<div class="app-layout">
	<nav class="sidebar">
		<div class="logo">⚡ ElecTrack</div>
		{#each navItems as item}
			<a href={item.href} class="nav-link">{item.label}</a>
		{/each}
	</nav>
	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
	}
	.sidebar {
		width: 220px;
		background: #1e293b;
		border-right: 1px solid #334155;
		padding: 20px 0;
		flex-shrink: 0;
	}
	.logo {
		font-size: 20px;
		font-weight: 700;
		padding: 0 20px 20px;
		border-bottom: 1px solid #334155;
		margin-bottom: 12px;
	}
	.nav-link {
		display: block;
		padding: 10px 20px;
		color: #94a3b8;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s;
	}
	.nav-link:hover {
		background: #334155;
		color: #e2e8f0;
	}
	.content {
		flex: 1;
		padding: 32px;
		overflow-y: auto;
	}
</style>
