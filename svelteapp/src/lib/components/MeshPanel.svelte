<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browserDaemon } from '$lib/daemon/browserDaemon.svelte';

	interface Daemon {
		id: string;
		name: string;
		type: string;
		capabilities: string[];
		status: string;
		tldr: string;
		lastHeartbeat: string;
	}

	interface MeshStatus {
		master: { status: string; port: number; uptime: number };
		daemons: Daemon[];
		piSessions: { activeSessions: number; daemonStatus: string };
		systemTldr: string;
	}

	let mesh = $state<MeshStatus | null>(null);
	let error = $state<string | null>(null);
	let loading = $state(true);
	let pollTimer: ReturnType<typeof setInterval>;

	async function fetchStatus() {
		try {
			const resp = await fetch('/api/mesh');
			const discovery = await resp.json();
			if (!discovery.available || !discovery.httpUrl) {
				error = 'Master not running';
				loading = false;
				return;
			}
			// Fetch full status from master
			const statusResp = await fetch(`${discovery.httpUrl}/status`);
			mesh = await statusResp.json();
			error = null;
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchStatus();
		pollTimer = setInterval(fetchStatus, 5000);
	});

	onDestroy(() => {
		clearInterval(pollTimer);
	});

	function daemonIcon(type: string): string {
		switch (type) {
			case 'pi': return '🤖';
			case 'pi-cli': return '💻';
			case 'browser': return '🌐';
			case 'custom': return '🔌';
			default: return '📡';
		}
	}

	function daemonColor(status: string): string {
		switch (status) {
			case 'alive': return 'border-green-500/30 bg-green-500/5';
			case 'stale': return 'border-yellow-500/30 bg-yellow-500/5';
			case 'dead': return 'border-red-500/30 bg-red-500/5';
			default: return 'border-panel-border';
		}
	}

	function statusDot(status: string): string {
		switch (status) {
			case 'alive': return 'text-green-400';
			case 'stale': return 'text-yellow-400';
			case 'dead': return 'text-red-400';
			default: return 'text-muted';
		}
	}

	function capabilityIcon(cap: string): string {
		if (cap.startsWith('code.')) return '📝';
		if (cap.startsWith('role.')) return '🎭';
		if (cap.startsWith('pipeline.')) return '🚀';
		if (cap.startsWith('container.')) return '📦';
		if (cap.startsWith('preview.')) return '👁';
		if (cap.startsWith('api_explorer.')) return '🔍';
		if (cap.startsWith('chat.')) return '💬';
		if (cap.startsWith('state.')) return '📊';
		if (cap.startsWith('llm.')) return '🧠';
		if (cap.startsWith('git.')) return '🔀';
		if (cap.startsWith('notify')) return '🔔';
		if (cap.startsWith('query.')) return '❓';
		return '⚡';
	}

	function capabilityLabel(cap: string): string {
		// Shorten common prefixes
		return cap
			.replace('code.', '')
			.replace('role.', '')
			.replace('pipeline.', '')
			.replace('container.', '')
			.replace('preview.', '')
			.replace('api_explorer.', '')
			.replace('chat.', '')
			.replace('state.', '');
	}

	function formatUptime(seconds: number): string {
		if (seconds < 60) return `${Math.round(seconds)}s`;
		const m = Math.floor(seconds / 60);
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		return `${h}h ${m % 60}m`;
	}

	function heartbeatAge(ts: string): string {
		const ms = Date.now() - new Date(ts).getTime();
		const s = Math.floor(ms / 1000);
		if (s < 10) return 'just now';
		if (s < 60) return `${s}s ago`;
		return `${Math.floor(s / 60)}m ago`;
	}

	// Deduplicate daemons with same name (stale reconnections)
	function deduplicateDaemons(daemons: Daemon[]): Daemon[] {
		const seen = new Map<string, Daemon>();
		for (const d of daemons) {
			const key = d.name;
			const existing = seen.get(key);
			if (!existing || new Date(d.lastHeartbeat) > new Date(existing.lastHeartbeat)) {
				seen.set(key, d);
			}
		}
		return Array.from(seen.values());
	}

	// Group daemons by type
	function groupByType(daemons: Daemon[]): Record<string, Daemon[]> {
		const groups: Record<string, Daemon[]> = {};
		for (const d of daemons) {
			const type = d.type;
			if (!groups[type]) groups[type] = [];
			groups[type].push(d);
		}
		return groups;
	}

	function typeLabel(type: string): string {
		switch (type) {
			case 'pi': return 'Pi Agents';
			case 'pi-cli': return 'CLI Sessions';
			case 'browser': return 'Browser';
			case 'custom': return 'Integrations';
			default: return type;
		}
	}
</script>

<div class="text-xs space-y-3">
	{#if loading}
		<div class="text-muted animate-pulse">Connecting to mesh...</div>
	{:else if error}
		<div class="text-muted">
			<span class="text-error">●</span> Mesh offline
			<span class="text-muted ml-2 italic">Start with <code class="bg-background px-1 rounded">./start-mesh.sh</code></span>
		</div>
	{:else if mesh}
		<!-- Master header -->
		<div class="flex items-center gap-3 pb-2 border-b border-panel-border">
			<div class="flex items-center gap-1.5">
				<span class="text-green-400">●</span>
				<span class="font-bold text-foreground">P10 Mesh</span>
			</div>
			<span class="text-muted">port {mesh.master.port}</span>
			<span class="text-muted">up {formatUptime(mesh.master.uptime)}</span>
			<div class="flex-1"></div>
			<span class="text-muted">{deduplicateDaemons(mesh.daemons).length} daemon{deduplicateDaemons(mesh.daemons).length !== 1 ? 's' : ''}</span>
			<button onclick={fetchStatus} class="text-muted hover:text-foreground transition-colors" title="Refresh">↻</button>
		</div>

		<!-- Daemon cards grouped by type -->
		{@const groups = groupByType(deduplicateDaemons(mesh.daemons))}
		<div class="flex flex-wrap gap-2">
			{#each Object.entries(groups) as [type, daemons]}
				{#each daemons as daemon (daemon.id)}
					<div class="border rounded-lg px-3 py-2 min-w-[200px] max-w-[320px] flex-1 {daemonColor(daemon.status)}">
						<!-- Header -->
						<div class="flex items-center gap-1.5 mb-1.5">
							<span class="text-base">{daemonIcon(daemon.type)}</span>
							<span class="font-bold text-foreground truncate">{daemon.name}</span>
							<span class="{statusDot(daemon.status)} ml-auto text-[10px]">●</span>
						</div>

						<!-- TLDR -->
						<div class="text-muted mb-1.5 leading-tight">
							{daemon.tldr.slice(0, 80)}{daemon.tldr.length > 80 ? '…' : ''}
						</div>

						<!-- Capabilities -->
						{#if daemon.capabilities.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each daemon.capabilities.slice(0, 8) as cap}
									<span class="bg-panel-bg border border-panel-border rounded px-1 py-0.5 text-[10px] text-muted" title={cap}>
										{capabilityIcon(cap)} {capabilityLabel(cap)}
									</span>
								{/each}
								{#if daemon.capabilities.length > 8}
									<span class="text-muted text-[10px] self-center">+{daemon.capabilities.length - 8}</span>
								{/if}
							</div>
						{/if}

						<!-- Footer -->
						<div class="text-muted mt-1.5 text-[10px] flex items-center gap-2">
							<span>{daemon.type}</span>
							<span class="opacity-50">{daemon.id.slice(0, 12)}</span>
							<span class="ml-auto">{heartbeatAge(daemon.lastHeartbeat)}</span>
						</div>
					</div>
				{/each}
			{/each}
		</div>
	{/if}
</div>
