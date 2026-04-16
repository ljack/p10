<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';

	let username = $state('');
	let error = $state('');
	let loading = $state(false);
	let ready = $state(false);

	onMount(() => {
		// If already logged in, redirect to dashboard
		if (auth.isLoggedIn) {
			goto('/dashboard');
			return;
		}
		ready = true;
	});

	async function handleLogin() {
		if (!username.trim()) {
			error = 'Enter a username';
			return;
		}
		error = '';
		loading = true;
		try {
			await auth.login(username.trim());
			goto('/dashboard');
		} catch (err: any) {
			error = err.message || 'Login failed';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleLogin();
	}
</script>

{#if !ready}
	<div class="h-screen bg-background"></div>
{:else}
	<div class="h-screen bg-background text-foreground flex flex-col items-center justify-center">
		<!-- Hero -->
		<div class="max-w-lg w-full px-6 space-y-10">
			<!-- Logo & Tagline -->
			<div class="text-center space-y-3">
				<h1 class="text-5xl font-bold text-accent tracking-wider">P10</h1>
				<p class="text-muted text-lg">AI Development Platform</p>
				<p class="text-muted text-sm italic">"Spec it by day, ship it by night."</p>
			</div>

			<!-- Info -->
			<div class="space-y-4 text-sm text-muted">
				<div class="flex items-start gap-3">
					<span class="text-accent text-lg">📋</span>
					<div>
						<span class="text-foreground font-bold">Specs-first workflow</span>
						<p>AI creates IDEA → PRD → PLAN before writing a single line of code.</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<span class="text-accent text-lg">🤖</span>
					<div>
						<span class="text-foreground font-bold">Multi-agent pipelines</span>
						<p>Planning, API, Frontend, and Review agents work together autonomously.</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<span class="text-accent text-lg">🔗</span>
					<div>
						<span class="text-foreground font-bold">Daemon mesh</span>
						<p>Browser, CLI, Telegram — all connected. Work from anywhere.</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<span class="text-accent text-lg">💻</span>
					<div>
						<span class="text-foreground font-bold">In-browser development</span>
						<p>WebContainer runs your full-stack app right in the browser.</p>
					</div>
				</div>
			</div>

			<!-- Login Form -->
			<div class="space-y-3">
				<div class="flex gap-2">
					<input
						bind:value={username}
						onkeydown={handleKeydown}
						placeholder="Enter username"
						disabled={loading}
						class="flex-1 bg-panel-bg border border-panel-border text-foreground px-4 py-3 rounded-lg outline-none focus:border-accent text-sm font-mono disabled:opacity-50"
						autocomplete="username"
						autofocus
					/>
					<button
						onclick={handleLogin}
						disabled={loading || !username.trim()}
						class="bg-accent text-background px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? '...' : 'Login'}
					</button>
				</div>
				{#if error}
					<p class="text-red-400 text-xs">{error}</p>
				{/if}
				<p class="text-muted text-xs text-center">Just pick a username. No password needed yet.</p>
			</div>

			<!-- Footer -->
			<div class="text-center text-muted text-xs">
				P10 v0.1.0 · Built with the platform itself
			</div>
		</div>
	</div>
{/if}
