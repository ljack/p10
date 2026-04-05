<script lang="ts">
	import { subscribe, type ContainerState, type ServerInfo } from '$lib/sandbox/container';
	import { onMount } from 'svelte';
	import { apiExplorer } from '$lib/stores/apiExplorer.svelte';

	let containerState = $state<ContainerState>({
		status: 'idle',
		serverStatus: 'stopped',
		serverUrl: null,
		servers: [],
		error: null
	});

	interface RouteInfo {
		methods: string[];
		path: string;
	}

	let method = $state('GET');
	let path = $state('/api/health');
	let requestBody = $state('');
	let response = $state<{ status: number; body: string; time: number } | null>(null);
	let loading = $state(false);
	let history = $state<Array<{ method: string; path: string; status: number; time: number }>>([]);
	let discoveredRoutes = $state<RouteInfo[]>([]);
	let discovering = $state(false);

	onMount(() => subscribe((s) => {
		const hadBackend = containerState.servers.some((srv) => srv.type === 'backend');
		containerState = s;
		const hasBackend = s.servers.some((srv) => srv.type === 'backend');
		// Auto-discover when backend appears or reappears
		if (hasBackend && !hadBackend) {
			setTimeout(() => discoverRoutes(), 1000);
		}
	}));

	let backendServer = $derived(containerState.servers.find((s) => s.type === 'backend'));

	// Re-discover when ChatPanel signals a server file was written
	$effect(() => {
		if (apiExplorer.refreshCounter > 0) {
			discoverRoutes();
		}
	});

	const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
	const methodColors: Record<string, string> = {
		GET: 'text-accent',
		POST: 'text-warning',
		PUT: 'text-blue-400',
		PATCH: 'text-purple-400',
		DELETE: 'text-error'
	};

	/** Fetch /_routes from the backend via the iframe bridge */
	async function discoverRoutes() {
		discovering = true;
		try {
			const result = await bridgeFetch('GET', '/api/_routes');
			if (result.status === 200) {
				discoveredRoutes = JSON.parse(result.body);
				console.log('[api-explorer] Discovered', discoveredRoutes.length, 'routes');
			}
		} catch (err) {
			console.warn('[api-explorer] Route discovery failed:', err);
		} finally {
			discovering = false;
		}
	}

	/** Make a request through the iframe postMessage bridge */
	function bridgeFetch(
		fetchMethod: string,
		fetchPath: string,
		fetchBody?: string
	): Promise<{ status: number; statusText: string; body: string }> {
		return new Promise((resolve, reject) => {
			const iframe = document.querySelector('iframe[title="Web Preview"]') as HTMLIFrameElement;
			if (!iframe?.contentWindow) {
				reject(new Error('Web preview iframe not available'));
				return;
			}

			const requestId = Math.random().toString(36).slice(2);
			const timeout = setTimeout(() => {
				window.removeEventListener('message', handler);
				reject(new Error('Request timeout (10s)'));
			}, 10000);

			function handler(event: MessageEvent) {
				if (event.data?.type === 'p10-api-response' && event.data.id === requestId) {
					clearTimeout(timeout);
					window.removeEventListener('message', handler);
					resolve(event.data);
				}
			}
			window.addEventListener('message', handler);

			iframe.contentWindow!.postMessage(
				{
					type: 'p10-api-request',
					id: requestId,
					url: `http://localhost:3001${fetchPath}`,
					method: fetchMethod,
					headers: { 'Content-Type': 'application/json' },
					body: fetchBody
				},
				'*'
			);
		});
	}

	async function sendRequest() {
		if (!backendServer) return;
		loading = true;
		response = null;

		const start = performance.now();

		try {
			const result = await bridgeFetch(
				method,
				path,
				['POST', 'PUT', 'PATCH'].includes(method) ? requestBody : undefined
			);

			const elapsed = Math.round(performance.now() - start);

			// Try to pretty-print JSON
			let body = result.body;
			try {
				body = JSON.stringify(JSON.parse(result.body), null, 2);
			} catch {
				// not JSON
			}

			response = { status: result.status, body, time: elapsed };
			history = [{ method, path, status: result.status, time: elapsed }, ...history.slice(0, 19)];

			// Re-discover routes after POST/PUT/DELETE (endpoints might have changed)
			if (['POST', 'PUT', 'DELETE'].includes(method)) {
				discoverRoutes();
			}
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

	function selectRoute(routeMethod: string, routePath: string) {
		method = routeMethod;
		path = routePath;
		response = null;
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
		<div class="flex-1 min-h-0 flex">
			<!-- Endpoint sidebar -->
			<div class="w-52 border-r border-panel-border overflow-y-auto shrink-0 p-2">
				<div class="flex items-center justify-between mb-2">
					<span class="text-muted font-bold">ENDPOINTS</span>
					<button
						onclick={discoverRoutes}
						disabled={discovering}
						class="text-muted hover:text-accent transition-colors {discovering ? 'animate-spin' : ''}"
						title="Refresh endpoints"
					>↻</button>
				</div>

				{#if discoveredRoutes.length === 0}
					<div class="text-muted italic py-2">
						{discovering ? 'Discovering...' : 'No endpoints found'}
					</div>
				{:else}
					<div class="space-y-0.5">
						{#each discoveredRoutes as route}
							{#each route.methods as m}
								<button
									onclick={() => selectRoute(m, route.path)}
									class="block w-full text-left px-1.5 py-1 rounded hover:bg-panel-border/50 transition-colors
										{method === m && path === route.path ? 'bg-panel-border/50' : ''}"
								>
									<span class="{methodColors[m] || 'text-muted'} font-bold">{m}</span>
									<span class="text-foreground ml-1">{route.path}</span>
								</button>
							{/each}
						{/each}
					</div>
				{/if}
			</div>

			<!-- Request / Response area -->
			<div class="flex-1 min-w-0 flex flex-col">
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
						<div class="p-2 text-muted">Select an endpoint or type a path and click Send</div>
					{/if}
				</div>

				<!-- History -->
				{#if history.length > 0}
					<div class="border-t border-panel-border p-2 max-h-24 overflow-y-auto shrink-0">
						<div class="text-muted font-bold mb-1">History</div>
						{#each history as req}
							<button
								onclick={() => selectRoute(req.method, req.path)}
								class="block w-full text-left py-0.5 hover:bg-panel-border/30 rounded px-1"
							>
								<span class={methodColors[req.method] || 'text-muted'}>{req.method}</span>
								<span class="text-foreground ml-1">{req.path}</span>
								<span class="text-muted ml-1">{req.status} {req.time}ms</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
