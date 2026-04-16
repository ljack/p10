<script lang="ts">
	import { onMount } from 'svelte';
	import { getInstance, subscribe, type ContainerState } from '$lib/sandbox/container';
	import { getLog, rollback, type GitCommit } from '$lib/git/gitManager';
	import { settings } from '$lib/stores/settings.svelte';
	import { specManager } from '$lib/specs/specManager.svelte';
	import { browserDaemon } from '$lib/daemon/browserDaemon.svelte';
	import PipelinePanel from './PipelinePanel.svelte';
	import MeshPanel from './MeshPanel.svelte';
	import { pipelineStore } from '$lib/stores/pipelines.svelte';
	import { loadSpecsFromContainer } from '$lib/specs/specLoader';
	import { meshEventsStore } from '$lib/stores/meshEvents.svelte';

	type BottomTab = 'files' | 'git' | 'specs' | 'pipelines' | 'tests' | 'mesh' | 'events' | 'settings';

	let activeTab = $state<BottomTab | null>(null);
	let containerState = $state<ContainerState>({
		status: 'idle',
		serverStatus: 'stopped',
		serverUrl: null, servers: [],
		error: null
	});
	let fileTree = $state<string[]>([]);
	let gitLog = $state<GitCommit[]>([]);
	let rollingBack = $state(false);
	let loadingSpecs = $state(false);

	async function loadSpecFiles() {
		loadingSpecs = true;
		try {
			await loadSpecsFromContainer();
		} catch (err) {
			console.error('Failed to load specs:', err);
		} finally {
			loadingSpecs = false;
		}
	}

	const tabs: { id: BottomTab; label: string; icon: string }[] = [
		{ id: 'files', label: 'Files', icon: '📁' },
		{ id: 'git', label: 'Git Log', icon: '🔀' },
		{ id: 'specs', label: 'Specs', icon: '📋' },
		{ id: 'pipelines', label: 'Pipelines', icon: '🚀' },
		{ id: 'tests', label: 'Tests', icon: '✅' },
		{ id: 'mesh', label: 'Mesh', icon: '🔗' },
		{ id: 'events', label: 'Events', icon: '📡' },
		{ id: 'settings', label: 'Settings', icon: '⚙️' }
	];

	onMount(() => {
		return subscribe((s) => {
			containerState = s;
		});
	});

	function toggle(tab: BottomTab) {
		activeTab = activeTab === tab ? null : tab;
		if (tab === 'files' && activeTab === 'files') {
			loadFiles();
		}
		if (tab === 'git' && activeTab === 'git') {
			loadGitLog();
		}
	}

	async function loadGitLog() {
		try {
			gitLog = await getLog();
		} catch {
			gitLog = [];
		}
	}

	async function handleRollback(oid: string) {
		rollingBack = true;
		try {
			await rollback(oid);
			await loadGitLog();
		} catch (err) {
			console.error('[git] Rollback failed:', err);
		} finally {
			rollingBack = false;
		}
	}

	async function loadFiles(dir = '.', prefix = '') {
		const container = getInstance();
		if (!container) return;

		try {
			const entries = await container.fs.readdir(dir, { withFileTypes: true });
			const result: string[] = [];
			for (const entry of entries) {
				if (entry.name === 'node_modules' || entry.name === '.git') continue;
				const path = prefix + entry.name;
				if (entry.isDirectory()) {
					result.push('📁 ' + path + '/');
					const children = await loadFilesRecursive(dir + '/' + entry.name, path + '/');
					result.push(...children);
				} else {
					result.push('📄 ' + path);
				}
			}
			fileTree = result;
		} catch {
			fileTree = ['(unable to read files)'];
		}
	}

	async function loadFilesRecursive(dir: string, prefix: string): Promise<string[]> {
		const container = getInstance();
		if (!container) return [];
		const entries = await container.fs.readdir(dir, { withFileTypes: true });
		const result: string[] = [];
		for (const entry of entries) {
			if (entry.name === 'node_modules') continue;
			const path = prefix + entry.name;
			if (entry.isDirectory()) {
				result.push('  📁 ' + path + '/');
				const children = await loadFilesRecursive(dir + '/' + entry.name, path + '/');
				result.push(...children.map((c) => '  ' + c));
			} else {
				result.push('  📄 ' + path);
			}
		}
		return result;
	}
</script>

<style>
	@keyframes rocket-launch {
		0% { transform: translateY(0px) rotate(0deg); }
		25% { transform: translateY(-2px) rotate(-1deg); }
		50% { transform: translateY(-4px) rotate(1deg); }
		75% { transform: translateY(-2px) rotate(-0.5deg); }
		100% { transform: translateY(0px) rotate(0deg); }
	}

	.rocket-active {
		animation: rocket-launch 1.2s ease-in-out infinite;
		transform-origin: center bottom;
	}
</style>

<div class="border-t border-panel-border bg-panel-bg shrink-0">
	<div class="h-8 flex items-center px-2 gap-1">
		{#each tabs as tab}
			<button
				onclick={() => toggle(tab.id)}
				class="px-2 py-0.5 text-xs rounded transition-colors {activeTab === tab.id
					? 'bg-accent-dim text-accent'
					: 'text-muted hover:text-foreground'}"
			>
				<span class="{tab.id === 'pipelines' && pipelineStore.hasActive ? 'rocket-active' : ''}">
					{tab.icon}
				</span>
				{tab.label}
				{#if tab.id === 'pipelines' && pipelineStore.hasActive}
					<span class="text-accent animate-pulse ml-0.5" title="Pipeline in progress">●</span>
				{:else if tab.id === 'events' && meshEventsStore.events.length > 0}
					<span class="text-accent ml-0.5" title="{meshEventsStore.events.length} events">●</span>
				{/if}
			</button>
		{/each}

		<div class="flex-1"></div>
		<span class="text-muted text-xs">P10 v0.1.0 {pipelineStore.hasActive ? '🚀' : ''}</span>
	</div>

	{#if activeTab}
		<div class="h-48 border-t border-panel-border p-3 overflow-y-auto">
			{#if activeTab === 'files'}
				<div class="text-xs text-muted space-y-0.5 font-mono">
					{#if containerState.status !== 'ready'}
						<div class="italic">Container not ready...</div>
					{:else if fileTree.length === 0}
						<div class="italic">Loading files...</div>
					{:else}
						{#each fileTree as line}
							<div class="whitespace-pre">{line}</div>
						{/each}
					{/if}
				</div>
			{:else if activeTab === 'git'}
				<div class="text-xs text-muted space-y-1 font-mono">
					{#if gitLog.length === 0}
						<div class="italic">No commits yet</div>
					{:else}
						{#each gitLog as commit, i}
							<div class="flex items-center gap-2 py-0.5 hover:bg-panel-border/30 px-1 rounded group">
								<span class="text-accent">{i === 0 ? '●' : '○'}</span>
								<span class="text-foreground flex-1 truncate">{commit.message}</span>
								<span class="text-muted shrink-0">{commit.oid.slice(0, 7)}</span>
								<span class="text-muted shrink-0">{commit.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
								{#if i > 0}
									<button
										onclick={() => handleRollback(commit.oid)}
										disabled={rollingBack}
										class="text-warning hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
										title="Rollback to this commit"
									>
										↩
									</button>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			{:else if activeTab === 'specs'}
				<div class="text-xs space-y-2">
					<div class="flex items-center justify-between mb-2">
						<span class="text-muted font-bold">Project Specifications</span>
						<button
							onclick={loadSpecFiles}
							disabled={loadingSpecs}
							class="text-accent hover:text-foreground text-xs disabled:opacity-50"
							title="Load spec files from container"
						>
							{loadingSpecs ? '⏳ Loading...' : '🔄 Load from Files'}
						</button>
					</div>
					{#each specManager.specs as spec}
						<div class="flex items-center gap-2 py-1 px-1 rounded hover:bg-panel-border/30 group">
							<span class="{spec.status === 'approved' ? 'text-accent' : spec.status === 'draft' ? 'text-warning' : 'text-muted'}">
								{spec.status === 'approved' ? '✅' : spec.status === 'draft' ? '📝' : spec.status === 'review' ? '👀' : '📋'}
							</span>
							<span class="text-foreground font-bold">{spec.filename}</span>
							<span class="text-muted">{spec.status}</span>
							{#if spec.content}
								<span class="text-muted">({spec.content.length} chars)</span>
							{/if}
							<div class="flex-1"></div>
							{#if spec.status === 'draft' || spec.status === 'review'}
								<button
									onclick={() => specManager.approveSpec(spec.filename)}
									class="text-accent opacity-0 group-hover:opacity-100 transition-opacity"
									title="Approve this spec"
								>
									✓ approve
								</button>
							{/if}
						</div>
					{/each}

					{#if specManager.tasks.length > 0}
						<div class="border-t border-panel-border pt-2 mt-2">
							<div class="text-muted font-bold mb-1">Tasks ({specManager.tasks.filter(t => t.status === 'done').length}/{specManager.tasks.length})</div>
							{#each specManager.tasks as task}
								<div class="flex items-center gap-2 py-0.5">
									<span class="{task.status === 'done' ? 'text-accent' : task.status === 'in-progress' ? 'text-warning' : 'text-muted'}">
										{task.status === 'done' ? '✅' : task.status === 'in-progress' ? '🔄' : task.status === 'blocked' ? '🚫' : '○'}
									</span>
									<span class="text-foreground {task.status === 'done' ? 'line-through opacity-60' : ''}">{task.title}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'pipelines'}
				<PipelinePanel />
			{:else if activeTab === 'tests'}
				<div class="text-xs text-muted">
					<div>No tests yet.</div>
					<div class="mt-2 italic">Testing in MVP 2+</div>
				</div>
			{:else if activeTab === 'mesh'}
				<MeshPanel />
			{:else if activeTab === 'events'}
				<div class="text-xs space-y-2 max-h-44 overflow-y-auto">
					<div class="flex items-center justify-between mb-2">
						<span class="text-muted font-bold">Mesh Events</span>
						<div class="flex gap-2">
							<button
								onclick={() => meshEventsStore.toggleRecording()}
								class="text-xs px-2 py-1 rounded {meshEventsStore.isRecording ? 'bg-accent text-background' : 'bg-panel-border text-muted'}"
							>
								{meshEventsStore.isRecording ? '⏸️ Pause' : '▶️ Record'}
							</button>
							<button
								onclick={() => meshEventsStore.clear()}
								class="text-xs px-2 py-1 rounded bg-panel-border text-muted hover:text-foreground"
							>
								🗑️ Clear
							</button>
						</div>
					</div>
					
					{#if meshEventsStore.events.length === 0}
						<div class="text-muted italic text-center py-4">No mesh events yet...</div>
					{:else}
						<div class="space-y-1">
							{#each meshEventsStore.events as event (event.id)}
								<div class="flex items-start gap-2 p-1 rounded hover:bg-panel-border/30 group">
									<span class="{event.direction === 'incoming' ? 'text-accent' : 'text-warning'} text-xs">
										{event.direction === 'incoming' ? '←' : '→'}
									</span>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 text-xs">
											<span class="text-foreground font-mono">{event.type}</span>
											<span class="text-muted">{event.timestamp.toLocaleTimeString()}</span>
										</div>
										<div class="text-muted text-xs truncate">
											{event.direction === 'incoming' ? event.source || '?' : event.target || '?'}
											{#if event.data}
												— {JSON.stringify(event.data).slice(0, 80)}...
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'settings'}
				<div class="text-xs space-y-3">
					<div>
						<label class="text-muted block mb-1" for="api-key">Anthropic API Key</label>
						<input
							id="api-key"
							type="password"
							placeholder="sk-ant-..."
							value={settings.apiKey}
							oninput={(e) => settings.setApiKey((e.target as HTMLInputElement).value)}
							class="bg-background border border-panel-border text-foreground text-xs px-2 py-1 rounded w-72 outline-none focus:border-accent"
						/>
						{#if settings.apiKey}
							<span class="text-accent ml-2">✓ saved</span>
						{/if}
					</div>
					<div>
						<label class="text-muted block mb-1" for="model">Model</label>
						<select
							id="model"
							value={settings.model}
							onchange={(e) => settings.setModel((e.target as HTMLSelectElement).value)}
							class="bg-background border border-panel-border text-foreground text-xs px-2 py-1 rounded outline-none focus:border-accent"
						>
							<option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
							<option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
							<option value="claude-opus-4-6">Claude Opus 4.6</option>
							<option value="claude-opus-4-5-20251101">Claude Opus 4.5</option>
							<option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
						</select>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
