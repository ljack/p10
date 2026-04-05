<script lang="ts">
	import { subscribe, type ContainerState, type ServerInfo } from '$lib/sandbox/container';
	import { onMount } from 'svelte';

	let containerState = $state<ContainerState>({
		status: 'idle',
		serverStatus: 'stopped',
		serverUrl: null,
		servers: [],
		error: null
	});

	let method = $state('GET');
	let path = $state('/api/health');
	let requestBody = $state('');
	let response = $state<{ status: number; body: string; time: number } | null>(null);
	let loading = $state(false);
	let history = $state<Array<{ method: string; path: string; status: number; time: number }>>([]);

	onMount(() => subscribe((s) => (containerState = s)));

	let backendServer = $derived(containerState.servers.find((s) => s.type === 'backend'));

	const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
	const methodColors: Record<string, string> = {
		GET: 'text-accent',
		POST: 'text-warning',
		PUT: 'text-blue-400',
		PATCH: 'text-purple-400',
		DELETE: 'text-error'
	};

	async function sendRequest() {
		if (!backendServer) return;
		loading = true;
		response = null;

		const url = `${backendServer.url}${path}`;
		const start = performance.now();

		try {
			const opts: RequestInit = {
				method,
				headers: { 'Content-Type': 'application/json' }
			};

			if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
				opts.body = requestBody;
			}

			const res = await fetch(url, opts);
			const elapsed = Math.round(performance.now() - start);
			const text = await res.text();

			// Try to pretty-print JSON
			let body = text;
			try {
				body = JSON.stringify(JSON.parse(text), null, 2);
			} catch {
				// not JSON, keep as-is
			}

			response = { status: res.status, body, time: elapsed };
			history = [{ method, path, status: res.status, time: elapsed }, ...history.slice(0, 19)];
		} catch (err) {
			const elapsed = Math.round(performance.now() - start);
			response = {
				status: 0,
				body: `Error: ${err instanceof Error ? err.message : String(err)}`,
				time: elapsed
			};
		} finally {
			loading = false;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			sendRequest();
		}
	}
</script>

<div class="h-full flex flex-col bg-panel-bg text-xs font-mono">
	{#if !backendServer}
		<div class="flex-1 flex items-center justify-center text-muted">
			<div class="text-center space-y-2">
				<div class="text-lg">🔌</div>
				<div>No API server detected</div>
				<div class="text-xs">Ask the agent to "add an API endpoint" to start the backend</div>
			</div>
		</div>
	{:else}
		<!-- Request Builder -->
		<div class="border-b border-panel-border p-2 space-y-2 shrink-0">
			<div class="flex gap-1">
				<select
					bind:value={method}
					class="bg-background border border-panel-border text-foreground px-1 py-0.5 rounded outline-none focus:border-accent {methodColors[method] || ''}"
				>
					{#each methods as m}
						<option value={m}>{m}</option>
					{/each}
				</select>
				<input
					bind:value={path}
					onkeydown={handleKeyDown}
					placeholder="/api/..."
					class="flex-1 bg-background border border-panel-border text-foreground px-2 py-0.5 rounded outline-none focus:border-accent"
				/>
				<button
					onclick={sendRequest}
					disabled={loading}
					class="bg-accent text-background px-3 py-0.5 rounded hover:bg-accent/80 disabled:opacity-50 font-bold"
				>
					{loading ? '...' : 'Send'}
				</button>
			</div>

			{#if ['POST', 'PUT', 'PATCH'].includes(method)}
				<textarea
					bind:value={requestBody}
					placeholder={'{"key": "value"}'}
					rows={3}
					class="w-full bg-background border border-panel-border text-foreground px-2 py-1 rounded outline-none focus:border-accent resize-none"
				></textarea>
			{/if}
		</div>

		<!-- Response -->
		<div class="flex-1 min-h-0 overflow-y-auto">
			{#if response}
				<div class="p-2 space-y-1">
					<div class="flex items-center gap-2">
						<span
							class="font-bold {response.status >= 200 && response.status < 300
								? 'text-accent'
								: response.status >= 400
									? 'text-error'
									: 'text-warning'}"
						>
							{response.status || 'ERR'}
						</span>
						<span class="text-muted">{response.time}ms</span>
					</div>
					<pre
						class="bg-background border border-panel-border rounded p-2 overflow-x-auto whitespace-pre-wrap text-foreground"
						>{response.body}</pre
					>
				</div>
			{:else if loading}
				<div class="p-2 text-muted animate-pulse">Sending request...</div>
			{:else}
				<div class="p-2 text-muted">Send a request to see the response</div>
			{/if}
		</div>

		<!-- History -->
		{#if history.length > 0}
			<div class="border-t border-panel-border p-2 max-h-24 overflow-y-auto shrink-0">
				<div class="text-muted font-bold mb-1">History</div>
				{#each history as req}
					<button
						onclick={() => {
							method = req.method;
							path = req.path;
						}}
						class="block w-full text-left py-0.5 hover:bg-panel-border/30 rounded px-1"
					>
						<span class={methodColors[req.method] || 'text-muted'}>{req.method}</span>
						<span class="text-foreground ml-1">{req.path}</span>
						<span class="text-muted ml-1">{req.status} {req.time}ms</span>
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>
