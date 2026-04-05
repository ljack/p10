<script lang="ts">
	import { onMount } from 'svelte';
	import { getInstance, subscribe, type ContainerState } from '$lib/sandbox/container';
	import { getLog, rollback, type GitCommit } from '$lib/git/gitManager';
	import { settings } from '$lib/stores/settings.svelte';

	type BottomTab = 'files' | 'git' | 'specs' | 'tests' | 'settings';

	let activeTab = $state<BottomTab | null>(null);
	let containerState = $state<ContainerState>({
		status: 'idle',
		serverStatus: 'stopped',
		serverUrl: null,
		error: null
	});
	let fileTree = $state<string[]>([]);
	let gitLog = $state<GitCommit[]>([]);
	let rollingBack = $state(false);

	const tabs: { id: BottomTab; label: string; icon: string }[] = [
		{ id: 'files', label: 'Files', icon: '📁' },
		{ id: 'git', label: 'Git Log', icon: '🔀' },
		{ id: 'specs', label: 'Specs', icon: '📋' },
		{ id: 'tests', label: 'Tests', icon: '✅' },
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

<div class="border-t border-panel-border bg-panel-bg shrink-0">
	<div class="h-8 flex items-center px-2 gap-1">
		{#each tabs as tab}
			<button
				onclick={() => toggle(tab.id)}
				class="px-2 py-0.5 text-xs rounded transition-colors {activeTab === tab.id
					? 'bg-accent-dim text-accent'
					: 'text-muted hover:text-foreground'}"
			>
				{tab.icon} {tab.label}
			</button>
		{/each}

		<div class="flex-1"></div>
		<span class="text-muted text-xs">P10 v0.1.0</span>
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
				<div class="text-xs text-muted space-y-1">
					<div>📋 IDEA.md — <span class="italic">not created yet</span></div>
					<div>📋 PRD.md — <span class="italic">not created yet</span></div>
					<div>📋 PLAN.md — <span class="italic">not created yet</span></div>
					<div class="mt-2 italic">Spec workflow in MVP 2</div>
				</div>
			{:else if activeTab === 'tests'}
				<div class="text-xs text-muted">
					<div>No tests yet.</div>
					<div class="mt-2 italic">Testing in MVP 2+</div>
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
							<option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
							<option value="claude-opus-4-20250514">Claude Opus 4</option>
							<option value="claude-haiku-3-20250514">Claude Haiku 3</option>
						</select>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
