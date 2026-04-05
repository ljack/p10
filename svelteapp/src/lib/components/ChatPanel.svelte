<script lang="ts">
	import { tick } from 'svelte';
	import { subscribe as subscribeContainer, type ContainerState } from '$lib/sandbox/container';
	// Note: getInstance, restartBackend, apiExplorer now used via toolExecutor module
	import { initRepo, commitAll, isRepoInitialized } from '$lib/git/gitManager';
	import { settings } from '$lib/stores/settings.svelte';
	import { agentState } from '$lib/stores/agentState.svelte';
	import { specManager } from '$lib/specs/specManager.svelte';
	import { errorStore } from '$lib/stores/errors.svelte';
	import { debugBus } from '$lib/debug/debugBus.svelte';
	import {
		executeTool,
		parseToolBlocks,
		stripToolBlocks,
		handlePostToolExecution
	} from '$lib/agent/toolExecutor';
	import { handleCommand } from '$lib/agent/chatCommands';
	import { formatContent } from '$lib/agent/formatContent';

	interface Message {
		role: 'user' | 'assistant' | 'tool';
		content: string;
		timestamp: Date;
		isStreaming?: boolean;
		toolName?: string;
		toolPath?: string;
		toolResult?: string;
	}

	let messages = $state<Message[]>([
		{
			role: 'assistant',
			content:
				'Welcome to P10. What would you like to build?\n\n**📋 Spec-driven** (larger projects):\n• "I want to build a project management tool"\n\n**⚡ Quick build** (small apps):\n• "Build a todo app with API backend"\n\nType `/help` for commands, `/mesh` for daemon status.',
			timestamp: new Date()
		}
	]);

	let input = $state('');
	let isStreaming = $state(false);
	let userHasScrolled = $state(false);
	// apiKey comes from settings store

	let messagesContainer: HTMLDivElement | undefined = $state();
	let messagesEnd: HTMLDivElement | undefined = $state();
	let inputEl: HTMLTextAreaElement | undefined = $state();

	function focusInput(e: MouseEvent) {
		// Only focus if clicking empty space, not when selecting text
		const selection = window.getSelection();
		if (selection && selection.toString().length > 0) return;
		const target = e.target as HTMLElement;
		// Don't steal focus from interactive elements or text content
		if (target.closest('button, a, textarea, input, pre, code')) return;
		inputEl?.focus();
	}

	let gitReady = $state(false);

	// Register debug provider for chat state
	$effect(() => {
		debugBus.registerProvider('chat', () => ({
			messageCount: messages.length,
			lastUserMessage: [...messages].reverse().find(m => m.role === 'user')?.content?.substring(0, 100) || null,
			lastAgentMessage: [...messages].reverse().find(m => m.role === 'assistant')?.content?.substring(0, 100) || null,
			isStreaming,
			hasApiKey: !!settings.apiKey
		}));
		debugBus.registerProvider('errors', () => errorStore.errors);
	});



	// Init git repo when container is ready
	$effect(() => {
		if (typeof window === 'undefined') return;
		const unsub = subscribeContainer(async (s: ContainerState) => {
			if (s.status === 'ready' && !gitReady) {
				try {
					const initialized = await isRepoInitialized();
					if (!initialized) {
						await initRepo();
						await commitAll('Initial project scaffold');
					}
					gitReady = true;
				} catch (err) {
					console.warn('[git] Init failed:', err);
				}
			}
		});
		return unsub;
	});

	function scrollToBottom() {
		if (!userHasScrolled) {
			messagesEnd?.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function handleScroll() {
		if (!messagesContainer) return;
		const dist =
			messagesContainer.scrollHeight -
			messagesContainer.scrollTop -
			messagesContainer.clientHeight;
		userHasScrolled = dist > 40;
	}

	/** Execute a tool block against the WebContainer */
	/** Process tool blocks from response and execute them */
	async function processToolBlocks(fullText: string): Promise<void> {
		const tools = parseToolBlocks(fullText);

		for (const { name: toolName, attrs, body } of tools) {
			// Add tool message
			messages = [
				...messages,
				{
					role: 'tool',
					content: '',
					timestamp: new Date(),
					toolName,
					toolPath: attrs.path || attrs.command || attrs.filename || ''
				}
			];

			await tick();
			scrollToBottom();

			// Execute
			agentState.setStatus('executing', `${toolName}: ${attrs.path || attrs.command || ''}`);
			const result = await executeTool(toolName, attrs, body);

			// Update tool message with result
			messages = messages.map((m, i) =>
				i === messages.length - 1 ? { ...m, toolResult: result } : m
			);

			await tick();
			scrollToBottom();
		}
	}

	async function handleSubmit() {
		const trimmed = input.trim();
		if (!trimmed || isStreaming) return;

		// Handle chat commands
		if (trimmed.startsWith('/')) {
			messages = [...messages, { role: 'user', content: trimmed, timestamp: new Date() }];
			input = '';
			const result = await handleCommand(trimmed);
			if (result.handled) {
				if (result.response === '__CLEAR__') {
					messages = [{ role: 'assistant', content: 'Chat cleared.', timestamp: new Date() }];
				} else {
					messages = [...messages, { role: 'assistant', content: result.response || '', timestamp: new Date() }];
				}
				return;
			}
		}

		// Handle API key input
		if (!settings.apiKey) {
			if (trimmed.startsWith('sk-ant-')) {
				settings.setApiKey(trimmed);
				messages = [
					...messages,
					{
						role: 'assistant',
						content: '✅ API key saved. Now tell me what you want to build!',
						timestamp: new Date()
					}
				];
				input = '';
				return;
			}
			messages = [
				...messages,
				{
					role: 'assistant',
					content:
						'⚠️ Please paste your Anthropic API key first (starts with `sk-ant-...`)',
					timestamp: new Date()
				}
			];
			return;
		}

		// Add user message
		messages = [...messages, { role: 'user', content: trimmed, timestamp: new Date() }];
		input = '';
		autoFixAttempts = 0; // Reset on new user message
		await handleSubmitInternal();
	}

	/** Core send logic — shared between user messages and auto-fix */
	let hadToolBlocks = false;

	async function handleSubmitInternal() {
		isStreaming = true;
		agentState.setStatus('thinking', 'processing request');

		await tick();
		scrollToBottom();

		try {
			// Build conversation history (skip tool messages)
			const apiMessages = messages
				.filter((m) => m.role === 'user' || m.role === 'assistant')
				.map((m) => ({ role: m.role, content: m.content }));

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
						messages: apiMessages,
						apiKey: settings.apiKey,
						model: settings.model,
						specContext: specManager.getSpecContext(),
						errorContext: errorStore.getContext()
					})
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status} ${await response.text()}`);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No response body');

			// Add streaming assistant message
			messages = [
				...messages,
				{ role: 'assistant', content: '', timestamp: new Date(), isStreaming: true }
			];

			const decoder = new TextDecoder();
			let fullText = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				fullText += chunk;
				agentState.setStatus('writing', 'generating response');

				// Update the streaming message (strip tool blocks for display)
				const displayText = stripToolBlocks(fullText);

				messages = messages.map((m, i) =>
					i === messages.length - 1 ? { ...m, content: displayText } : m
				);

				await tick();
				scrollToBottom();
			}

			// Mark streaming as done
			messages = messages.map((m, i) =>
				i === messages.length - 1 ? { ...m, isStreaming: false } : m
			);

			// Now process any tool blocks
			hadToolBlocks = /<tool:\w+/.test(fullText);
			await processToolBlocks(fullText);

			// Handle post-tool actions (backend restart, API refresh)
			await handlePostToolExecution(fullText);

			// Auto-commit after tool execution
			if (hadToolBlocks && gitReady) {
				try {
					const commitMsg = stripToolBlocks(fullText).split('\n')[0].slice(0, 80) || 'Agent changes';
					await commitAll(commitMsg);
				} catch (err) {
					console.warn('[git] Auto-commit failed:', err);
				}
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			messages = [
				...messages,
				{ role: 'assistant', content: `❌ Error: ${errorMsg}`, timestamp: new Date() }
			];
		} finally {
			isStreaming = false;
			userHasScrolled = false;
			agentState.setStatus('idle');
			errorStore.clear();

			// Wait for build errors to appear, then auto-fix
			if (hadToolBlocks) {
				setTimeout(() => checkForBuildErrors(), 5000);
			}
		}
	}

	/** Check for build errors and auto-send them to the agent */
	let autoFixAttempts = 0;
	const MAX_AUTO_FIX = 3;

	async function checkForBuildErrors() {
		const errors = errorStore.getContext();
		if (!errors || isStreaming || autoFixAttempts >= MAX_AUTO_FIX) return;

		autoFixAttempts++;
		console.log('[agent] Auto-detected build errors, sending to agent (attempt', autoFixAttempts + ')');

		// Add error as a system message
		messages = [
			...messages,
			{
				role: 'user',
				content: `The preview shows build errors. Please fix them:\n${errors}`,
				timestamp: new Date()
			}
		];

		// Trigger the agent
		await handleSubmitInternal();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function formatTime(d: Date): string {
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="h-full flex flex-col bg-panel-bg border-r border-panel-border" onclick={focusInput}>
	<!-- Header -->
	<div class="h-8 flex items-center px-3 border-b border-panel-border shrink-0">
		<span class="text-accent text-xs font-bold">CHAT</span>
		{#if isStreaming}
			<span class="ml-2 text-warning text-xs animate-pulse">● streaming</span>
		{/if}
		{#if !settings.apiKey}
			<span class="ml-2 text-error text-xs">● no API key</span>
		{/if}
	</div>

	<!-- Messages -->
	<div
		bind:this={messagesContainer}
		onscroll={handleScroll}
		class="flex-1 overflow-y-auto p-3 space-y-4 min-h-0"
	>
		{#each messages as msg, i}
			{#if msg.role === 'tool'}
				{@const isError = msg.toolResult?.startsWith('Error:') || msg.toolResult?.startsWith('❌')}
				{@const isDone = !!msg.toolResult && !isError}
				{@const isRunning = !msg.toolResult}
				<div
					class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full -mt-3
						{isError ? 'bg-error/10 text-error' : isDone ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}"
				>
					{#if isRunning}
						<span class="animate-pulse">●</span>
					{:else}
						<span>●</span>
					{/if}
					<span class="font-bold">{msg.toolName}</span>
					{#if msg.toolPath}
						<span class="opacity-70">{msg.toolPath}</span>
					{/if}
				</div>
			{:else}
				<div class="text-sm leading-relaxed">
					<div
						class="text-xs font-bold mb-1 {msg.role === 'user'
							? 'text-foreground'
							: 'text-accent'}"
					>
						{msg.role === 'user' ? 'you' : 'agent'}
						<span class="text-muted font-normal ml-2">{formatTime(msg.timestamp)}</span>
					</div>
					<div class="pl-2 border-l-2 border-panel-border whitespace-pre-wrap">
						{@html formatContent(msg.content)}
						{#if msg.isStreaming}
							<span
								class="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-middle"
							></span>
						{/if}
					</div>
				</div>
			{/if}
		{/each}
		<div bind:this={messagesEnd}></div>
	</div>

	<!-- Input -->
	<div class="border-t border-panel-border p-2 shrink-0">
		<div class="flex items-end gap-2">
			<span class="text-accent text-sm font-bold pb-1">❯</span>
			<textarea
				bind:this={inputEl}
				bind:value={input}
				onkeydown={handleKeyDown}
				placeholder={isStreaming
					? 'Agent is responding...'
					: !settings.apiKey
						? 'Paste your Anthropic API key (sk-ant-...)...'
						: 'Type a message...'}
				disabled={isStreaming}
				rows={1}
				class="flex-1 bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted disabled:opacity-50"
				style="min-height: 1.5rem; max-height: 6rem;"
			></textarea>
			<button
				onclick={handleSubmit}
				disabled={isStreaming}
				class="text-muted hover:text-accent text-xs transition-colors pb-1 disabled:opacity-30"
			>
				↵
			</button>
		</div>
	</div>
</div>


