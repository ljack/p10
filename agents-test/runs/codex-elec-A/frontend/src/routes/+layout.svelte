<script lang="ts">
	import '../app.css';

	const navItems = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/devices', label: 'Devices' },
		{ href: '/consumption', label: 'Consumption' },
		{ href: '/schedules', label: 'Schedules' },
		{ href: '/budget', label: 'Budget' }
	];
</script>

<svelte:head>
	<title>Gridwise Home Energy</title>
	<meta
		name="description"
		content="Track devices, consumption, schedules, and monthly electricity budgets for your home."
	/>
</svelte:head>

<div class="shell">
	<header class="topbar fade-in">
		<div class="brand">
			<h1>Gridwise Home Energy</h1>
			<p>Electricity tracking, budget awareness, and lightweight home automation planning.</p>
		</div>

		<nav class="nav" aria-label="Primary">
			{#each navItems as item}
				<a href={item.href}>{item.label}</a>
			{/each}
		</nav>
	</header>

	<main class="page-shell">
		<slot />
	</main>
</div>
