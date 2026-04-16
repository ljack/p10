<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getInstance } from '$lib/sandbox/container';

	interface TerminalLine {
		id: string;
		type: 'input' | 'output' | 'error';
		content: string;
		timestamp: Date;
	}

	let lines = $state<TerminalLine[]>([]);
	let currentInput = $state('');
	let inputElement: HTMLInputElement;
	let terminalElement: HTMLDivElement;
	let currentProcess: any = null;
	let shell = $state<'bash' | 'sh' | 'node'>('bash');
	let isConnected = $state(false);
	let processId = 0;

	function addLine(type: 'input' | 'output' | 'error', content: string) {
		lines.push({
			id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
			type,
			content,
			timestamp: new Date()
		});
		
		// Auto-scroll to bottom
		setTimeout(() => {
			if (terminalElement) {
				terminalElement.scrollTop = terminalElement.scrollHeight;
			}
		}, 10);
	}

	async function startShell() {
		const container = getInstance();
		if (!container) {
			addLine('error', 'WebContainer not ready');
			return;
		}

		try {
			isConnected = true;
			addLine('output', `Starting ${shell} session...`);
			
			// Spawn interactive shell
			const shellCmd = shell === 'node' ? 'node' : shell;
			const args = shell === 'node' ? ['-i'] : ['-i']; // interactive mode
			
			currentProcess = await container.spawn(shellCmd, args);
			processId++;
			
			addLine('output', `${shell} session started (PID: ${processId})`);
			addLine('output', 'Type commands below. Use Ctrl+C to interrupt, "exit" to close.');
			
			// Handle process output
			currentProcess.output.pipeTo(new WritableStream({
				write(chunk: string) {
					if (chunk.trim()) {
						addLine('output', chunk);
					}
				}
			}));
			
			// Handle process completion
			currentProcess.exit.then((code: number) => {
				addLine('output', `Process exited with code: ${code}`);
				isConnected = false;
				currentProcess = null;
			});
			
		} catch (error) {
			addLine('error', `Failed to start shell: ${error}`);
			isConnected = false;
		}
	}

	async function executeCommand() {
		if (!currentInput.trim()) return;
		
		const command = currentInput.trim();
		currentInput = '';
		
		// Show command in terminal
		addLine('input', `$ ${command}`);
		
		if (!isConnected || !currentProcess) {
			if (command === 'clear') {
				lines = [];
				return;
			}
			
			// Not connected - run single command
			const container = getInstance();
			if (!container) {
				addLine('error', 'WebContainer not ready');
				return;
			}
			
			try {
				const parts = command.split(' ');
				const cmd = parts[0];
				const args = parts.slice(1);
				
				const process = await container.spawn(cmd, args);
				let output = '';
				
				process.output.pipeTo(new WritableStream({
					write(chunk: string) {
						output += chunk;
						addLine('output', chunk);
					}
				}));
				
				const exitCode = await process.exit;
				if (exitCode !== 0) {
					addLine('error', `Command exited with code: ${exitCode}`);
				}
				
			} catch (error) {
				addLine('error', `Command failed: ${error}`);
			}
		} else {
			// Send to active shell process
			try {
				const writer = currentProcess.input.getWriter();
				await writer.write(command + '\n');
				writer.releaseLock();
			} catch (error) {
				addLine('error', `Failed to send command: ${error}`);
			}
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			executeCommand();
		} else if (event.ctrlKey && event.key === 'c') {
			event.preventDefault();
			if (currentProcess) {
				addLine('input', '^C');
				currentProcess.kill();
				isConnected = false;
			}
		} else if (event.ctrlKey && event.key === 'l') {
			event.preventDefault();
			lines = [];
		}
	}

	function clearTerminal() {
		lines = [];
	}

	function disconnectShell() {
		if (currentProcess) {
			currentProcess.kill();
			currentProcess = null;
		}
		isConnected = false;
	}

	onMount(() => {
		addLine('output', 'WebContainer Terminal Ready');
		addLine('output', 'Select a shell and click Connect, or run individual commands');
		inputElement?.focus();
	});

	onDestroy(() => {
		if (currentProcess) {
			currentProcess.kill();
		}
	});
</script>

<div class="h-full flex flex-col bg-black text-green-400 font-mono text-sm">
	<!-- Terminal Toolbar -->
	<div class="flex items-center gap-3 px-3 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
		<div class="flex items-center gap-2">
			<select 
				bind:value={shell}
				disabled={isConnected}
				class="bg-gray-800 text-green-400 text-xs px-2 py-1 rounded border border-gray-600 disabled:opacity-50"
			>
				<option value="bash">bash</option>
				<option value="sh">sh</option>
				<option value="node">node</option>
			</select>
			
			{#if isConnected}
				<button 
					onclick={disconnectShell}
					class="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
				>
					🔌 Disconnect
				</button>
			{:else}
				<button 
					onclick={startShell}
					class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
				>
					🔌 Connect
				</button>
			{/if}
		</div>
		
		<div class="flex-1"></div>
		
		<div class="flex items-center gap-2">
			<span class="text-xs text-gray-400">
				{isConnected ? `Connected (${shell})` : 'Disconnected'}
			</span>
			<button 
				onclick={clearTerminal}
				class="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
				title="Clear terminal (Ctrl+L)"
			>
				🗑️ Clear
			</button>
		</div>
	</div>

	<!-- Terminal Output -->
	<div 
		bind:this={terminalElement}
		class="flex-1 overflow-y-auto p-3 space-y-1 min-h-0"
	>
		{#each lines as line (line.id)}
			<div class="flex">
				<span class="text-gray-500 text-xs mr-2 shrink-0">
					{line.timestamp.toLocaleTimeString().slice(-8)}
				</span>
				<pre class="flex-1 whitespace-pre-wrap break-words {
					line.type === 'input' ? 'text-cyan-300' : 
					line.type === 'error' ? 'text-red-400' : 
					'text-green-400'
				}">{line.content}</pre>
			</div>
		{/each}
	</div>

	<!-- Terminal Input -->
	<div class="flex items-center gap-2 px-3 py-2 bg-gray-900 border-t border-gray-700 shrink-0">
		<span class="text-cyan-300">$</span>
		<input
			bind:this={inputElement}
			bind:value={currentInput}
			onkeydown={handleKeyDown}
			placeholder={isConnected ? 'Interactive shell mode...' : 'Enter command...'}
			class="flex-1 bg-transparent text-green-400 outline-none placeholder-gray-500"
			autocomplete="off"
			spellcheck="false"
		/>
		<button
			onclick={executeCommand}
			disabled={!currentInput.trim()}
			class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			Run
		</button>
	</div>
</div>

<style>
	/* Terminal-style scrollbar */
	.overflow-y-auto::-webkit-scrollbar {
		width: 8px;
	}
	.overflow-y-auto::-webkit-scrollbar-track {
		background: #1f2937;
	}
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: #4b5563;
		border-radius: 4px;
	}
	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background: #6b7280;
	}
</style>