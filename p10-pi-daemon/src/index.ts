/**
 * P10 Pi Daemon — Autonomous coding agent that connects to the daemon mesh.
 * Uses the pi SDK for LLM-powered coding assistance.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { WsClient } from './wsClient.js';
import { ModelRouter } from './modelRouter.js';
import { getRole, isValidRole, type AgentRole } from './roles.js';

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
let idleSince: string = new Date().toISOString();

// --- Activity Events ---

function emitActivity(type: string, data: any) {
	client.send('master', 'emit_event', {
		type: `agent.${type}`,
		data: { agentId: DAEMON_ID, ...data },
	});
}

function emitIdle() {
	idleSince = new Date().toISOString();
	emitActivity('idle', { idleSince, taskCount, lastAction });
	console.log(`[pi-daemon] 💤 Idle`);
}

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

	if (currentRole) {
		parts.push(`role: ${currentRole}`);
	}

	parts.push(`tasks: ${taskCount}`);
	parts.push(`sessions: ${sessionPool.size}`);

	if (errorCount > 0) {
		parts.push(`errors: ${errorCount}`);
	}

	parts.push(`last: ${lastAction}`);

	return parts.join(', ');
}

// --- Session Pool ---
// One session per role for clean context isolation.
// The default (null role) session is used for generic tasks and queries.

let modelRouter: ModelRouter | null = null;
let piModules: any = null;
let currentRole: string | null = null;

const sessionPool = new Map<string, any>();  // role → session
const SESSION_DEFAULT = '__default__';

async function loadPiModules() {
	if (piModules) return piModules;
	piModules = await import('@mariozechner/pi-coding-agent');
	return piModules;
}

async function ensureModelRouter() {
	if (modelRouter) return modelRouter;
	const { AuthStorage, ModelRegistry } = await loadPiModules();
	const authStorage = AuthStorage.create();
	const modelRegistry = ModelRegistry.create(authStorage);
	modelRouter = new ModelRouter(modelRegistry);
	return modelRouter;
}

/**
 * Create a new pi agent session, optionally with a role-specific system prompt.
 */
async function createSession(role?: AgentRole): Promise<any> {
	const {
		AuthStorage, ModelRegistry, SessionManager,
		createAgentSession, codingTools
	} = await loadPiModules();

	const authStorage = AuthStorage.create();
	const modelRegistry = ModelRegistry.create(authStorage);

	const available = await modelRegistry.getAvailable();
	if (available.length === 0) {
		console.log('[pi-daemon] No models available — check API keys');
		return null;
	}

	const sessionOpts: any = {
		cwd: PROJECT_DIR,
		sessionManager: SessionManager.inMemory(),
		authStorage,
		modelRegistry,
		tools: codingTools,
	};

	// Inject role-specific system prompt
	if (role) {
		const roleConfig = getRole(role);
		sessionOpts.systemPrompt = roleConfig.systemPrompt;
	}

	const { session } = await createAgentSession(sessionOpts);

	session.subscribe((event: any) => {
		if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
			process.stdout.write(event.assistantMessageEvent.delta);
		}
		if (event.type === 'tool_execution_start') {
			const roleLabel = role || 'default';
			console.log(`\n[pi-daemon:${roleLabel}] Tool: ${event.toolName}`);
		}
	});

	const label = role || 'default';
	console.log(`[pi-daemon] Session created for role: ${label} (models: ${available.map((m: any) => m.id).join(', ')})`);
	return session;
}

/**
 * Get or create a session for the given role.
 * Generic tasks use the default session.
 */
async function getSession(role?: AgentRole, taskType?: string): Promise<any> {
	const key = role || SESSION_DEFAULT;

	// Return existing session from pool
	let session = sessionPool.get(key);
	if (session) {
		currentRole = role || null;
		// Optionally switch model based on task type
		if (taskType) {
			const router = await ensureModelRouter();
			const classified = router.classifyTask(taskType);
			const bestModel = await router.getBestModel(classified);
			if (bestModel && bestModel.id !== session.model?.id) {
				try {
					await session.setModel(bestModel);
					console.log(`[pi-daemon] Switched to ${bestModel.id} for ${classified} task`);
				} catch { /* keep current model */ }
			}
		}
		return session;
	}

	// Create new session
	session = await createSession(role);
	if (session) {
		sessionPool.set(key, session);
		currentRole = role || null;
	}
	return session;
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
		'git.diff',
		'role.api_agent',
		'role.web_agent',
		'role.review_agent',
		'role.planning_agent',
		'pipeline.task_with_role'
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

		case 'task_with_role': {
			const result = await handleTaskWithRole(msg.payload);
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
	const session = await getSession();
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

/** Extract text result from the last assistant message in a session */
function extractResult(session: any): string {
	const msgs = session.messages;
	const lastMsg = msgs?.[msgs.length - 1];
	if (!lastMsg) return 'Task completed (no response)';

	if (typeof lastMsg.content === 'string') return lastMsg.content;
	if (Array.isArray(lastMsg.content)) {
		const text = lastMsg.content
			.filter((c: any) => c.type === 'text')
			.map((c: any) => c.text)
			.join('\n');
		if (text) return text;
	}
	if (lastMsg.text) return lastMsg.text;

	console.log('[pi-daemon] Could not extract text from:', JSON.stringify(lastMsg).slice(0, 200));
	return 'Task completed';
}

/** Handle a generic task (no role — uses default session) */
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
	emitActivity('task.started', { taskId: payload?.taskId, title: instruction.slice(0, 100) });

	const session = await getSession(undefined, instruction);
	if (!session) {
		currentTask = null;
		emitActivity('task.failed', { taskId: payload?.taskId, title: instruction.slice(0, 100), error: 'Pi agent not available' });
		emitIdle();
		return { error: 'Pi agent not available' };
	}

	try {
		let prompt = instruction;
		if (payload.context) {
			prompt = `Context:\n${payload.context}\n\nTask:\n${instruction}`;
		}

		await session.prompt(prompt);
		const result = extractResult(session);

		currentTask = null;
		lastAction = `completed: ${instruction.slice(0, 40)}`;
		appendToHistory(`Completed: ${instruction.slice(0, 100)}`);
		emitActivity('task.done', { taskId: payload?.taskId, title: instruction.slice(0, 100), result: result.slice(0, 200) });
		emitIdle();

		return { success: true, result: result.slice(0, 2000) };
	} catch (err: any) {
		currentTask = null;
		errorCount++;
		lastAction = `failed: ${instruction.slice(0, 40)}`;
		appendToHistory(`Failed: ${instruction.slice(0, 100)} — ${err.message}`);
		emitActivity('task.failed', { taskId: payload?.taskId, title: instruction.slice(0, 100), error: err.message });
		emitIdle();
		return { error: err.message };
	}
}

/** Handle a role-based task from a pipeline */
async function handleTaskWithRole(payload: any): Promise<any> {
	const instruction = payload?.instruction || '';
	const role = payload?.role as AgentRole | undefined;
	const pipelineContext = payload?.pipelineContext || ''; // Results from prior tasks

	// Security check
	const security = checkTaskSecurity(instruction);
	if (!security.safe) {
		console.log(`[pi-daemon] 🚨 Task blocked: ${security.reason}`);
		appendToHistory(`BLOCKED [${role}]: ${instruction.slice(0, 100)} — ${security.reason}`);
		return { error: security.reason, blocked: true };
	}

	if (role && !isValidRole(role)) {
		return { error: `Unknown role: ${role}` };
	}

	taskCount++;
	const roleLabel = role || 'default';
	currentTask = `[${roleLabel}] ${instruction.slice(0, 50)}`;
	lastAction = `[${roleLabel}] ${instruction.slice(0, 40)}`;
	appendToHistory(`Task [${roleLabel}]: ${instruction.slice(0, 100)}`);

	console.log(`\n[pi-daemon] 📋 [${roleLabel}] Task: ${instruction}`);
	emitActivity('task.started', { taskId: payload?.taskId, title: instruction.slice(0, 100), role: roleLabel });

	const session = await getSession(role, instruction);
	if (!session) {
		currentTask = null;
		emitActivity('task.failed', { taskId: payload?.taskId, title: instruction.slice(0, 100), role: roleLabel, error: 'Pi agent not available' });
		emitIdle();
		return { error: 'Pi agent not available' };
	}

	try {
		// Build prompt with pipeline context (results from prior tasks)
		const parts: string[] = [];

		if (pipelineContext) {
			parts.push(`## Prior task results\n${pipelineContext}`);
		}
		if (payload.context) {
			parts.push(`## Additional context\n${payload.context}`);
		}
		parts.push(`## Task\n${instruction}`);

		const prompt = parts.join('\n\n');
		await session.prompt(prompt);
		const result = extractResult(session);

		currentTask = null;
		lastAction = `[${roleLabel}] completed: ${instruction.slice(0, 40)}`;
		appendToHistory(`Completed [${roleLabel}]: ${instruction.slice(0, 100)}`);
		emitActivity('task.done', { taskId: payload?.taskId, title: instruction.slice(0, 100), role: roleLabel, result: result.slice(0, 200) });
		emitIdle();

		return { success: true, role: roleLabel, result: result.slice(0, 2000) };
	} catch (err: any) {
		currentTask = null;
		errorCount++;
		lastAction = `[${roleLabel}] failed: ${instruction.slice(0, 40)}`;
		appendToHistory(`Failed [${roleLabel}]: ${instruction.slice(0, 100)} — ${err.message}`);
		emitActivity('task.failed', { taskId: payload?.taskId, title: instruction.slice(0, 100), role: roleLabel, error: err.message });
		emitIdle();
		return { error: err.message, role: roleLabel };
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
	for (const [key, session] of sessionPool) {
		try { session.dispose(); } catch { /* ignore */ }
	}
	sessionPool.clear();
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Keep process alive
setInterval(() => {}, 60000);
