<script lang="ts">
	import { tick } from 'svelte';
	import { getInstance } from '$lib/sandbox/container';

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
				'Welcome to P10. What would you like to build?\n\nI can create React apps in the live preview. Try:\n• "Build a todo app"\n• "Add a dark theme"\n• "Create a counter with a reset button"',
			timestamp: new Date()
		}
	]);

	let input = $state('');
	let isStreaming = $state(false);
	let userHasScrolled = $state(false);
	let apiKey = $state('');

	let messagesContainer: HTMLDivElement | undefined = $state();
	let messagesEnd: HTMLDivElement | undefined = $state();

	// Load API key from localStorage
	$effect(() => {
		if (typeof window !== 'undefined') {
			apiKey = localStorage.getItem('p10_api_key') || '';
		}
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
				case 'write_file': {
					const path = attrs.path;
					const dir = path.split('/').slice(0, -1).join('/');
					if (dir) await container.fs.mkdir(dir, { recursive: true });
					await container.fs.writeFile(path, body);
					return `✅ Written: ${path} (${body.length} bytes)`;
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
					const parts = attrs.command.split(' ');
					const proc = await container.spawn(parts[0], parts.slice(1));
					let output = '';
					proc.output.pipeTo(new WritableStream({ write(c) { output += c; } }));
					const code = await proc.exit;
					return `Exit ${code}\n${output}`;
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
		if (!apiKey) {
			if (trimmed.startsWith('sk-ant-')) {
				apiKey = trimmed;
				localStorage.setItem('p10_api_key', trimmed);
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
		isStreaming = true;

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
				body: JSON.stringify({ messages: apiMessages, apiKey })
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
			await processToolBlocks(fullText);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			messages = [
				...messages,
				{ role: 'assistant', content: `❌ Error: ${errorMsg}`, timestamp: new Date() }
			];
		} finally {
			isStreaming = false;
			userHasScrolled = false;
		}
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

<div class="h-full flex flex-col bg-panel-bg border-r border-panel-border">
	<!-- Header -->
	<div class="h-8 flex items-center px-3 border-b border-panel-border shrink-0">
		<span class="text-accent text-xs font-bold">CHAT</span>
		{#if isStreaming}
			<span class="ml-2 text-warning text-xs animate-pulse">● streaming</span>
		{/if}
		{#if !apiKey}
			<span class="ml-2 text-error text-xs">● no API key</span>
		{/if}
	</div>

	<!-- Messages -->
	<div
		bind:this={messagesContainer}
		onscroll={handleScroll}
		class="flex-1 overflow-y-auto p-3 space-y-4 min-h-0"
	>
		{#each messages as msg}
			{#if msg.role === 'tool'}
				<div class="text-xs border border-panel-border rounded bg-background p-2 space-y-1">
					<div class="text-muted font-bold">
						🔧 {msg.toolName}
						{#if msg.toolPath}
							<span class="text-accent font-normal ml-1">{msg.toolPath}</span>
						{/if}
					</div>
					{#if msg.toolResult}
						<pre
							class="text-muted text-xs max-h-32 overflow-y-auto whitespace-pre-wrap"
							>{msg.toolResult.length > 500
								? msg.toolResult.slice(0, 500) + '...'
								: msg.toolResult}</pre
						>
					{:else}
						<span class="text-muted animate-pulse">executing...</span>
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
				bind:value={input}
				onkeydown={handleKeyDown}
				placeholder={isStreaming
					? 'Agent is responding...'
					: !apiKey
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
