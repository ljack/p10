<script lang="ts">
	type BottomTab = 'files' | 'git' | 'specs' | 'tests' | 'settings';

	let activeTab = $state<BottomTab | null>(null);

	const tabs: { id: BottomTab; label: string; icon: string }[] = [
		{ id: 'files', label: 'Files', icon: '📁' },
		{ id: 'git', label: 'Git Log', icon: '🔀' },
		{ id: 'specs', label: 'Specs', icon: '📋' },
		{ id: 'tests', label: 'Tests', icon: '✅' },
		{ id: 'settings', label: 'Settings', icon: '⚙️' }
	];

	function toggle(tab: BottomTab) {
		activeTab = activeTab === tab ? null : tab;
	}
</script>

<div class="border-t border-panel-border bg-panel-bg shrink-0">
	<!-- Tab buttons -->
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

	<!-- Expandable panel -->
	{#if activeTab}
		<div class="h-48 border-t border-panel-border p-3 overflow-y-auto">
			{#if activeTab === 'files'}
				<div class="text-xs text-muted space-y-1 font-mono">
					<div>📁 src/</div>
					<div class="pl-4">📄 App.tsx</div>
					<div class="pl-4">📄 index.css</div>
					<div class="pl-4">📄 main.tsx</div>
					<div>📄 package.json</div>
					<div class="text-xs mt-2 text-muted italic">File browser connected in Sprint 1</div>
				</div>
			{:else if activeTab === 'git'}
				<div class="text-xs text-muted space-y-1 font-mono">
					<div><span class="text-accent">●</span> Initial commit — Project scaffolded</div>
					<div class="text-xs mt-2 text-muted italic">Git integration in Sprint 5</div>
				</div>
			{:else if activeTab === 'specs'}
				<div class="text-xs text-muted space-y-1">
					<div>📋 IDEA.md — <span class="italic">not created yet</span></div>
					<div>📋 PRD.md — <span class="italic">not created yet</span></div>
					<div>📋 PLAN.md — <span class="italic">not created yet</span></div>
					<div class="text-xs mt-2 text-muted italic">Spec workflow in MVP 2</div>
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
