<script lang="ts">
	import { onMount } from 'svelte';
	import { getInstance, subscribe, type ContainerState } from '$lib/sandbox/container';

	type BottomTab = 'files' | 'git' | 'specs' | 'tests' | 'settings';

	let activeTab = $state<BottomTab | null>(null);
	let containerState = $state<ContainerState>({
		status: 'idle',
		serverStatus: 'stopped',
		serverUrl: null,
		error: null
	});
	let fileTree = $state<string[]>([]);

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
					<div><span class="text-accent">●</span> Initial commit — Project scaffolded</div>
					<div class="mt-2 italic">Git integration in Sprint 5</div>
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
							class="bg-background border border-panel-border text-foreground text-xs px-2 py-1 rounded w-72 outline-none focus:border-accent"
						/>
					</div>
					<div class="text-muted italic">Settings persistence in Sprint 6</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
