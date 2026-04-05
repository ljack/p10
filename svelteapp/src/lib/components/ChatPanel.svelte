<script lang="ts">
	import { tick } from 'svelte';
	import { getInstance, restartBackend } from '$lib/sandbox/container';
	import { initRepo, commitAll, getLog, rollback, isRepoInitialized } from '$lib/git/gitManager';
	import { subscribe as subscribeContainer, type ContainerState } from '$lib/sandbox/container';
	import { settings } from '$lib/stores/settings.svelte';
	import { agentState } from '$lib/stores/agentState.svelte';
	import { specManager } from '$lib/specs/specManager.svelte';
	import { errorStore } from '$lib/stores/errors.svelte';

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
				'Welcome to P10. What would you like to build?\n\nI support two workflows:\n\n**📋 Spec-driven** (recommended for larger projects):\n• "I want to build a project management tool"\n• "Let\'s plan a Jira clone"\n\n**⚡ Quick build** (for small apps):\n• "Build a todo app"\n• "Create a counter with a reset button"',
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

	function focusInput() {
		inputEl?.focus();
	}

	let gitReady = $state(false);



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
	async function executeTool(
		name: string,
		attrs: Record<string, string>,
		body: string
	): Promise<string> {
		const container = getInstance();
		if (!container) return 'Error: WebContainer not ready';

		try {
			switch (name) {
				case 'write_spec': {
					const filename = attrs.filename;
					specManager.updateSpec(filename, body, 'draft');
					// Also parse tasks if it's PLAN.md
					if (filename === 'PLAN.md') {
						specManager.parseTasks(body);
					}
					return `📋 Spec updated: ${filename} (${body.length} chars)`;
				}
				case 'write_file': {
					const path = attrs.path;
					const dir = path.split('/').slice(0, -1).join('/');
					if (dir) await container.fs.mkdir(dir, { recursive: true });

					let content = body;
					// Auto-inject /_routes endpoint if agent rewrote server/index.js without it
					if (path === 'server/index.js' && !content.includes('/_routes')) {
						const routesSnippet = `\n// Auto-injected: route discovery for API Explorer\napp.get('/api/_routes', (req, res) => {\n  const routes = [];\n  app._router.stack.forEach((mw) => {\n    if (mw.route) {\n      const methods = Object.keys(mw.route.methods).map(m => m.toUpperCase());\n      routes.push({ methods, path: mw.route.path });\n    }\n  });\n  res.json(routes.filter(r => r.path !== '/api/_routes'));\n});\n`;
						// Insert before app.listen
						const listenIdx = content.lastIndexOf('app.listen');
						if (listenIdx > 0) {
							content = content.slice(0, listenIdx) + routesSnippet + content.slice(listenIdx);
						} else {
							content += routesSnippet;
						}
						console.log('[agent] Auto-injected /_routes endpoint into server/index.js');
					}

					await container.fs.writeFile(path, content);
					return `✅ Written: ${path} (${content.length} bytes)`;
				}
				case 'read_file': {
					const content = await container.fs.readFile(attrs.path, 'utf-8');
					return content;
				}
				case 'list_files': {
					const entries = await container.fs.readdir(attrs.path || '.', {
						withFileTypes: true
					});
					return entries
						.filter((e) => e.name !== 'node_modules')
						.map((e) => (e.isDirectory() ? e.name + '/' : e.name))
						.join('\n');
				}
				case 'run_command': {
					// Block server start commands — servers are already running
					const cmd = attrs.command;
					if (cmd.includes('npm run dev') || cmd.includes('npm start') || cmd.includes('node server')) {
						return 'Skipped: dev servers are already running. No need to start them.';
					}

					const parts = cmd.split(' ');
					const proc = await container.spawn(parts[0], parts.slice(1));
					let output = '';
					proc.output.pipeTo(new WritableStream({ write(c) { output += c; } }));

					// Timeout after 30s for long-running commands
					const code = await Promise.race([
						proc.exit,
						new Promise<number>((resolve) => setTimeout(() => {
							proc.kill();
							resolve(-1);
						}, 30000))
					]);
					return code === -1 ? `Timeout (30s)\n${output}` : `Exit ${code}\n${output}`;
				}
				default:
					return `Unknown tool: ${name}`;
			}
		} catch (err) {
			return `Error: ${err instanceof Error ? err.message : String(err)}`;
		}
	}

	/** Parse tool blocks from streamed text and execute them */
	async function processToolBlocks(fullText: string): Promise<void> {
		// Match <tool:name attr="val">body</tool:name> and <tool:name attr="val" />
		const toolRegex =
			/<tool:(\w+)((?:\s+\w+="[^"]*")*)(?:\s*\/>|>([\s\S]*?)<\/tool:\1>)/g;

		let match;
		while ((match = toolRegex.exec(fullText)) !== null) {
			const toolName = match[1];
			const attrsStr = match[2];
			const body = match[3] || '';

			// Parse attributes
			const attrs: Record<string, string> = {};
			const attrRegex = /(\w+)="([^"]*)"/g;
			let attrMatch;
			while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
				attrs[attrMatch[1]] = attrMatch[2];
			}

			// Add tool message
			messages = [
				...messages,
				{
					role: 'tool',
					content: '',
					timestamp: new Date(),
					toolName,
					toolPath: attrs.path || attrs.command || ''
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
				const displayText = fullText.replace(
					/<tool:\w+(?:\s+\w+="[^"]*")*(?:\s*\/>|>[\s\S]*?<\/tool:\w+>)/g,
					''
				).trim();

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

			// Restart backend if server/ files were written
			if (/<tool:write_file\s+path="server\//.test(fullText)) {
				try {
					await restartBackend();
					console.log('[agent] Backend restarted after server file change');
				} catch (err) {
					console.warn('[agent] Backend restart failed:', err);
				}
			}

			// Auto-commit after tool execution
			if (hadToolBlocks && gitReady) {
				try {
					// Use first line of assistant response as commit message
					const displayText = fullText.replace(
						/<tool:\w+(?:\s+\w+="[^"]*")*(?:\s*\/>|>[\s\S]*?<\/tool:\w+>)/g, ''
					).trim();
					const commitMsg = displayText.split('\n')[0].slice(0, 80) || 'Agent changes';
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

<script lang="ts" module>
	export function formatContent(content: string): string {
		if (!content) return '';
		let html = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		// Code blocks
		html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
			const langLabel = lang
				? `<div class="text-xs text-muted px-3 py-1 border-b border-panel-border">${lang}</div>`
				: '';
			return `<div class="my-2 rounded bg-background border border-panel-border overflow-x-auto">${langLabel}<pre class="text-xs p-3 text-foreground"><code>${code}</code></pre></div>`;
		});

		// Inline code
		html = html.replace(
			/`([^`]+)`/g,
			'<code class="bg-background text-accent px-1 py-0.5 rounded text-xs">$1</code>'
		);

		// Bold
		html = html.replace(
			/\*\*([^*]+)\*\*/g,
			'<strong class="text-foreground font-bold">$1</strong>'
		);

		return html;
	}
</script>
