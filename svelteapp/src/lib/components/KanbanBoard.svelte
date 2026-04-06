<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browserDaemon } from '$lib/daemon/browserDaemon.svelte';

	interface TaskAnalysis {
		rewrittenTitle?: string;
		questions?: string[];
		ideas?: string[];
		dependencies?: string[];
		suggestedTags?: string[];
		summary?: string;
		analyzedAt: string;
	}

	interface BoardTask {
		id: string;
		title: string;
		instruction: string;
		description?: string;
		column: string;
		assignedTo?: string;
		origin: { channel: string; userId?: string; userName?: string };
		priority: string;
		scope?: 'project' | 'platform';
		tags?: string[];
		humanCreated?: boolean;
		analysis?: TaskAnalysis;
		createdAt: string;
		startedAt?: string;
		completedAt?: string;
		result?: string;
	}

	interface BoardSnapshot {
		planned: BoardTask[];
		'in-progress': BoardTask[];
		done: BoardTask[];
		failed: BoardTask[];
		blocked: BoardTask[];
		stats: {
			total: number;
			byColumn: Record<string, number>;
			byPriority: Record<string, number>;
			byScope?: Record<string, number>;
		};
	}

	let board = $state<BoardSnapshot | null>(null);
	let error = $state<string | null>(null);
	let loading = $state(true);
	let expandedTask = $state<string | null>(null);
	let newTaskTitle = $state('');
	let scopeFilter = $state<'all' | 'project' | 'platform'>('all');
	let addingTask = $state(false);
	let pollTimer: ReturnType<typeof setInterval>;

	const columns: { key: keyof Pick<BoardSnapshot, 'planned' | 'in-progress' | 'done' | 'failed' | 'blocked'>; label: string; icon: string; color: string }[] = [
		{ key: 'planned', label: 'Planned', icon: '📋', color: 'text-muted' },
		{ key: 'in-progress', label: 'In Progress', icon: '▶', color: 'text-accent' },
		{ key: 'done', label: 'Done', icon: '✓', color: 'text-green-400' },
		{ key: 'failed', label: 'Failed', icon: '✗', color: 'text-error' },
		{ key: 'blocked', label: 'Blocked', icon: '⚠', color: 'text-warning' },
	];

	async function fetchBoard() {
		try {
			const resp = await fetch('/api/board');
			if (!resp.ok) throw new Error(`${resp.status}`);
			board = await resp.json();
			error = null;
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function toggleExpand(taskId: string) {
		expandedTask = expandedTask === taskId ? null : taskId;
	}

	async function addTask() {
		const title = newTaskTitle.trim();
		if (!title || addingTask) return;

		addingTask = true;
		try {
			await fetch('/api/board', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					humanCreated: true,
					origin: { channel: 'browser', userName: 'user' },
					priority: 'normal',
				}),
			});
			newTaskTitle = '';
			await fetchBoard();
		} catch (err) {
			console.error('Failed to add task:', err);
		} finally {
			addingTask = false;
		}
	}

	function handleAddKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			addTask();
		}
	}

	function channelIcon(channel: string): string {
		switch (channel) {
			case 'telegram': return '💬';
			case 'browser-chat': return '🌐';
			case 'rest-api': return '🔌';
			case 'pi-cli': return '🤖';
			case 'system': return '⚙️';
			default: return '📡';
		}
	}

	function priorityBadge(priority: string): string {
		switch (priority) {
			case 'urgent': return '🔴';
			case 'high': return '🟠';
			case 'normal': return '';
			case 'low': return '🔵';
			default: return '';
		}
	}

	function elapsed(from: string, to?: string): string {
		const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
		const s = Math.floor(ms / 1000);
		if (s < 60) return `${s}s`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		return `${h}h ${m % 60}m`;
	}

	// Listen for board events from mesh
	let unsubscribe: (() => void) | undefined;

	onMount(() => {
		fetchBoard();
		// Poll every 3 seconds for updates
		pollTimer = setInterval(fetchBoard, 3000);
	});

	onDestroy(() => {
		clearInterval(pollTimer);
		unsubscribe?.();
	});
</script>

<div class="h-full flex flex-col bg-panel-bg overflow-hidden">
	<!-- Header -->
	<div class="h-8 flex items-center px-3 border-b border-panel-border shrink-0 gap-2">
		<span class="text-accent text-xs font-bold">BOARD</span>
		{#if board}
			<span class="text-muted text-xs">{board.stats.total} task{board.stats.total !== 1 ? 's' : ''}</span>
		{/if}
		<div class="flex-1"></div>
		<button
			onclick={fetchBoard}
			class="text-muted hover:text-foreground text-xs px-1 transition-colors"
			title="Refresh"
		>↻</button>
	</div>

	<!-- Board -->
	<div class="flex-1 min-h-0 overflow-x-auto">
		{#if loading}
			<div class="h-full flex items-center justify-center">
				<span class="text-muted text-xs animate-pulse">Loading board...</span>
			</div>
		{:else if error}
			<div class="h-full flex items-center justify-center">
				<div class="text-center">
					<span class="text-error text-xs">Board unavailable</span>
					<p class="text-muted text-xs mt-1">{error}</p>
				</div>
			</div>
		{:else if board}
			<div class="flex h-full gap-0">
				{#each columns as col}
					{@const tasks = board[col.key] || []}
					{@const count = tasks.length}
					<!-- Column -->
					<div class="flex-1 min-w-[160px] flex flex-col border-r border-panel-border last:border-r-0">
						<!-- Column header -->
						<div class="px-2 py-1.5 border-b border-panel-border flex items-center gap-1.5 shrink-0">
							<span class="text-xs">{col.icon}</span>
							<span class="text-xs font-medium {col.color}">{col.label}</span>
							{#if count > 0}
								<span class="text-xs text-muted ml-auto bg-panel-border rounded-full px-1.5">{count}</span>
							{/if}
						</div>

						<!-- Quick add (planned column only) -->
						{#if col.key === 'planned'}
							<div class="px-1.5 pt-1.5">
								<input
									type="text"
									bind:value={newTaskTitle}
									onkeydown={handleAddKeydown}
									placeholder="+ Add task..."
									disabled={addingTask}
									class="w-full bg-background border border-panel-border rounded px-2 py-1 text-xs
										   text-foreground placeholder:text-muted/50 outline-none
										   focus:border-accent/50 transition-colors disabled:opacity-50"
								/>
							</div>
						{/if}

						<!-- Task cards -->
						<div class="flex-1 overflow-y-auto p-1.5 space-y-1.5">
							{#each tasks as task (task.id)}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									onclick={() => toggleExpand(task.id)}
									class="bg-background border border-panel-border rounded px-2 py-1.5 cursor-pointer
										   hover:border-accent/30 transition-colors text-xs group"
								>
									<!-- Title row -->
									<div class="flex items-start gap-1">
										{#if priorityBadge(task.priority)}
											<span class="shrink-0 mt-0.5">{priorityBadge(task.priority)}</span>
										{/if}
										<span class="text-foreground leading-tight break-words flex-1">{task.title.slice(0, 80)}{task.title.length > 80 ? '…' : ''}</span>
									</div>

									<!-- Meta row -->
									<div class="flex items-center gap-1.5 mt-1 text-muted">
										<span title={task.origin.channel}>{channelIcon(task.origin.channel)}</span>
										{#if task.origin.userName}
											<span class="truncate max-w-[60px]">{task.origin.userName}</span>
										{/if}
										{#if col.key === 'in-progress'}
											<span class="ml-auto text-accent">{elapsed(task.startedAt || task.createdAt)}</span>
										{:else if col.key === 'done' || col.key === 'failed'}
											<span class="ml-auto">{elapsed(task.createdAt, task.completedAt)}</span>
										{:else}
											<span class="ml-auto">{elapsed(task.createdAt)}</span>
										{/if}
									</div>

									<!-- Analysis badge -->
									{#if task.analysis}
										<div class="mt-1 flex items-center gap-1">
											<span class="text-accent text-xs" title="AI analyzed">🔍</span>
											{#if task.analysis.summary}
												<span class="text-muted text-xs truncate">{task.analysis.summary.slice(0, 50)}</span>
											{/if}
										</div>
									{:else if task.humanCreated}
										<div class="mt-1">
											<span class="text-muted/40 text-xs" title="Pending analysis">⏳ analyzing...</span>
										</div>
									{/if}

									<!-- Expanded details -->
									{#if expandedTask === task.id}
										<div class="mt-2 pt-2 border-t border-panel-border space-y-1.5">
											{#if task.description}
												<div class="text-muted break-words italic">{task.description}</div>
											{/if}
											{#if task.analysis}
												{#if task.analysis.summary}
													<div class="text-foreground break-words">{task.analysis.summary}</div>
												{/if}
												{#if task.analysis.questions?.length}
													<div>
														<span class="text-warning">❓</span>
														{#each task.analysis.questions as q}
															<span class="text-muted">{q}</span>{' '}
														{/each}
													</div>
												{/if}
												{#if task.analysis.ideas?.length}
													<div>
														<span class="text-accent">💡</span>
														{#each task.analysis.ideas as idea}
															<span class="text-muted">{idea}</span>{' '}
														{/each}
													</div>
												{/if}
												{#if task.analysis.dependencies?.length}
													<div>
														<span>🔗</span>
														{#each task.analysis.dependencies as dep}
															<span class="text-muted bg-panel-border rounded px-1">{dep}</span>{' '}
														{/each}
													</div>
												{/if}
											{/if}
											{#if task.assignedTo}
												<div><span class="text-muted">Assigned:</span> {task.assignedTo}</div>
											{/if}
											{#if task.instruction && task.instruction !== task.title}
												<div class="text-muted break-words">{task.instruction.slice(0, 300)}</div>
											{/if}
											{#if task.result}
												<div class="text-muted break-words bg-panel-bg rounded p-1">
													{task.result.slice(0, 200)}{task.result.length > 200 ? '…' : ''}
												</div>
											{/if}
											{#if task.tags?.length}
												<div class="flex gap-1 flex-wrap">
													{#each task.tags as tag}
														<span class="bg-accent-dim text-accent rounded px-1">{tag}</span>
													{/each}
												</div>
											{/if}
											<div class="text-muted">ID: {task.id}</div>
										</div>
									{/if}
								</div>
							{:else}
								<div class="text-muted text-xs text-center py-4 opacity-50">
									—
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
