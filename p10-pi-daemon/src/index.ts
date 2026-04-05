/**
 * P10 Pi Daemon — Autonomous coding agent that connects to the daemon mesh.
 * Uses the pi SDK for LLM-powered coding assistance.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { WsClient } from './wsClient.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEMORY_DIR = join(__dirname, '..', 'memory');
const MASTER_WS_URL = process.env.P10_MASTER_URL || 'ws://localhost:7777';
const PROJECT_DIR = process.env.P10_PROJECT_DIR || '/Users/jarkko/_dev/p10';
const DAEMON_ID = 'pi-' + Math.random().toString(36).slice(2, 6);

// State
let currentTask: string | null = null;
let lastAction: string = 'started';
let taskCount = 0;
let errorCount = 0;

// Load memory
function loadMemory(file: string): string {
	const path = join(MEMORY_DIR, file);
	return existsSync(path) ? readFileSync(path, 'utf-8') : '';
}

function saveMemory(file: string, content: string) {
	writeFileSync(join(MEMORY_DIR, file), content);
}

function appendToHistory(entry: string) {
	const path = join(MEMORY_DIR, 'history.md');
	const existing = existsSync(path) ? readFileSync(path, 'utf-8') : '# Pi Daemon History\n\n';
	writeFileSync(path, existing + `\n- [${new Date().toISOString()}] ${entry}`);
}

// TLDR generator
function generateTldr(): string {
	const parts: string[] = [];

	if (currentTask) {
		parts.push(`working: ${currentTask.slice(0, 60)}`);
	} else {
		parts.push('idle');
	}

	parts.push(`tasks: ${taskCount}`);

	if (errorCount > 0) {
		parts.push(`errors: ${errorCount}`);
	}

	parts.push(`last: ${lastAction}`);

	return parts.join(', ');
}

// Pi SDK agent session (lazy loaded)
let piSession: any = null;

async function getPiSession() {
	if (piSession) return piSession;

	try {
		const {
			AuthStorage,
			ModelRegistry,
			SessionManager,
			createAgentSession,
			codingTools
		} = await import('@mariozechner/pi-coding-agent');

		const authStorage = AuthStorage.create();
		const modelRegistry = ModelRegistry.create(authStorage);

		// Get available models
		const available = await modelRegistry.getAvailable();
		if (available.length === 0) {
			console.log('[pi-daemon] No models available — check API keys');
			return null;
		}

		console.log(`[pi-daemon] Available models: ${available.map(m => m.id).join(', ')}`);

		const { session } = await createAgentSession({
			cwd: PROJECT_DIR,
			sessionManager: SessionManager.inMemory(),
			authStorage,
			modelRegistry,
			tools: codingTools,
		});

		// Subscribe to events
		session.subscribe((event: any) => {
			if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
				process.stdout.write(event.assistantMessageEvent.delta);
			}
			if (event.type === 'tool_execution_start') {
				console.log(`\n[pi-daemon] Tool: ${event.toolName}`);
			}
		});

		piSession = session;
		console.log('[pi-daemon] Pi agent session created');
		return session;
	} catch (err: any) {
		console.error('[pi-daemon] Failed to create pi session:', err.message);
		return null;
	}
}

// WebSocket client
const client = new WsClient({
	url: MASTER_WS_URL,
	daemonId: DAEMON_ID,
	name: 'P10 Pi Agent',
	type: 'pi',
	capabilities: [
		'code.read',
		'code.write',
		'code.execute',
		'code.review',
		'code.fix',
		'llm.prompt',
		'git.commit',
		'git.diff'
	]
});

client.setTldrProvider(generateTldr);

// Handle incoming messages
client.onMessage(async (msg) => {
	switch (msg.type) {
		case 'pong': {
			// Master heartbeat response
			break;
		}

		case 'query': {
			const answer = await handleQuery(msg.payload?.question);
			client.send(msg.from, 'query_response', {
				queryId: msg.payload?.queryId,
				answer
			});
			break;
		}

		case 'task': {
			const result = await handleTask(msg.payload);
			client.send(msg.from, 'task_result', {
				taskId: msg.payload?.taskId,
				result
			});
			break;
		}

		case 'register': {
			console.log(`[pi-daemon] Daemon joined: ${msg.payload?.daemon?.name}`);
			break;
		}

		case 'unregister': {
			console.log(`[pi-daemon] Daemon left: ${msg.payload?.id}`);
			break;
		}
	}
});

async function handleQuery(question: string): Promise<string> {
	const q = question?.toLowerCase() || '';

	if (q.includes('status') || q.includes('state')) {
		return JSON.stringify({
			daemonId: DAEMON_ID,
			currentTask,
			taskCount,
			errorCount,
			lastAction,
			tldr: generateTldr(),
			memory: loadMemory('memory.md').slice(0, 500)
		});
	}

	if (q.includes('soul')) {
		return loadMemory('soul.md');
	}

	if (q.includes('history')) {
		return loadMemory('history.md').slice(-2000);
	}

	// For complex queries, use the pi agent
	const session = await getPiSession();
	if (!session) return 'Pi agent not available';

	try {
		currentTask = `query: ${question.slice(0, 50)}`;
		await session.prompt(question);

		// Get the last assistant message
		const messages = session.messages;
		const lastMsg = messages[messages.length - 1];
		const answer = lastMsg?.content?.[0]?.text || 'No response';

		currentTask = null;
		lastAction = `answered query: ${question.slice(0, 40)}`;
		return answer;
	} catch (err: any) {
		currentTask = null;
		errorCount++;
		return `Error: ${err.message}`;
	}
}

/** Basic security check for destructive operations */
function checkTaskSecurity(instruction: string): { safe: boolean; reason?: string } {
	const dangerous = [
		{ pattern: /rm\s+(-rf|-fr|--recursive)\s/i, reason: 'Recursive file deletion' },
		{ pattern: /sudo\s/i, reason: 'Superuser operation' },
		{ pattern: /git\s+push\s+.*--force/i, reason: 'Force push' },
		{ pattern: /git\s+reset\s+--hard/i, reason: 'Hard reset' },
		{ pattern: /npm\s+publish/i, reason: 'Package publishing' },
		{ pattern: /curl\s+.*\|\s*(bash|sh)/i, reason: 'Remote code execution' },
		{ pattern: /DROP\s+(TABLE|DATABASE)/i, reason: 'Database destruction' },
	];

	for (const { pattern, reason } of dangerous) {
		if (pattern.test(instruction)) {
			return { safe: false, reason: `🚨 BLOCKED: ${reason}` };
		}
	}
	return { safe: true };
}

async function handleTask(payload: any): Promise<any> {
	const instruction = payload?.instruction || '';

	// Security check
	const security = checkTaskSecurity(instruction);
	if (!security.safe) {
		console.log(`[pi-daemon] 🚨 Task blocked: ${security.reason}`);
		appendToHistory(`BLOCKED: ${instruction.slice(0, 100)} — ${security.reason}`);
		return { error: security.reason, blocked: true };
	}

	taskCount++;
	currentTask = instruction.slice(0, 60);
	lastAction = `task: ${instruction.slice(0, 40)}`;
	appendToHistory(`Task: ${instruction.slice(0, 100)}`);

	console.log(`\n[pi-daemon] 📋 Task: ${instruction}`);

	const session = await getPiSession();
	if (!session) {
		currentTask = null;
		return { error: 'Pi agent not available' };
	}

	try {
		// Build context from the task
		let prompt = instruction;
		if (payload.context) {
			prompt = `Context:\n${payload.context}\n\nTask:\n${instruction}`;
		}

		await session.prompt(prompt);

		// Get result
		const messages = session.messages;
		const lastMsg = messages[messages.length - 1];
		const result = lastMsg?.content?.[0]?.text || 'Task completed';

		currentTask = null;
		lastAction = `completed: ${instruction.slice(0, 40)}`;
		appendToHistory(`Completed: ${instruction.slice(0, 100)}`);

		return { success: true, result: result.slice(0, 2000) };
	} catch (err: any) {
		currentTask = null;
		errorCount++;
		lastAction = `failed: ${instruction.slice(0, 40)}`;
		appendToHistory(`Failed: ${instruction.slice(0, 100)} — ${err.message}`);
		return { error: err.message };
	}
}

// Start
console.log(`\n  ┌──────────────────────────────────────┐`);
console.log(`  │  P10 Pi Daemon                        │`);
console.log(`  │  ID: ${DAEMON_ID.padEnd(31)}│`);
console.log(`  │  Project: ${PROJECT_DIR.slice(-27).padEnd(27)}│`);
console.log(`  │  Master: ${MASTER_WS_URL.padEnd(28)}│`);
console.log(`  └──────────────────────────────────────┘\n`);

client.connect();

// Graceful shutdown
function cleanup() {
	console.log('\n[pi-daemon] Shutting down...');
	client.disconnect();
	piSession?.dispose();
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Keep process alive
setInterval(() => {}, 60000);
