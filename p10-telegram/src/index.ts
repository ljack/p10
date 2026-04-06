/**
 * P10 Telegram Bot Daemon
 * 
 * Bridges Telegram messages to the P10 daemon mesh.
 * 
 * Users can:
 * - Send messages to interact with the P10 agent
 * - Receive build status updates
 * - Get mesh status and debug info
 * - Send tasks to daemons
 * 
 * Setup:
 * 1. Create a bot via @BotFather on Telegram
 * 2. Set TELEGRAM_BOT_TOKEN env var
 * 3. Set P10_ALLOWED_USERS env var (comma-separated Telegram user IDs)
 */

import TelegramBot from 'node-telegram-bot-api';
import WebSocket from 'ws';
import { readFileSync, existsSync } from 'fs';

// Config — load from config.json or env vars
const MASTER_DISCOVERY_FILE = '/tmp/p10-master.json';
const DAEMON_ID = 'telegram-' + Math.random().toString(36).slice(2, 6);
const CONFIG_FILE = new URL('../config.json', import.meta.url).pathname;

interface TelegramConfig {
	botToken: string;
	botUsername: string;
	allowedUsers: Array<{ id: number; name: string }>;
}

function loadConfig(): TelegramConfig | null {
	try {
		if (existsSync(CONFIG_FILE)) {
			return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
		}
	} catch { /* ignore */ }
	return null;
}

const config = loadConfig();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || config?.botToken;
const ALLOWED_USERS = process.env.P10_ALLOWED_USERS
	? process.env.P10_ALLOWED_USERS.split(',').filter(Boolean).map(Number)
	: (config?.allowedUsers?.map(u => u.id) || []);

if (!BOT_TOKEN) {
	console.error('❌ No bot token found.');
	console.error('   Run setup first: npx tsx src/setup.ts');
	console.error('   Or set TELEGRAM_BOT_TOKEN env var.');
	process.exit(1);
}

// Discover Master Daemon
function getMasterUrl(): { ws: string; http: string } | null {
	if (!existsSync(MASTER_DISCOVERY_FILE)) return null;
	try {
		const data = JSON.parse(readFileSync(MASTER_DISCOVERY_FILE, 'utf-8'));
		return { ws: data.wsUrl, http: data.httpUrl };
	} catch { return null; }
}

// Security: check if user is allowed
function isAllowed(userId: number): boolean {
	if (ALLOWED_USERS.length === 0) return true; // No restriction if not configured
	return ALLOWED_USERS.includes(userId);
}

// Master Daemon REST client
async function masterFetch(path: string, options?: RequestInit): Promise<any> {
	const master = getMasterUrl();
	if (!master) throw new Error('Master Daemon not running');
	const resp = await fetch(`${master.http}${path}`, {
		...options,
		headers: { 'Content-Type': 'application/json', ...options?.headers },
	});
	return resp.json();
}

// WebSocket connection to Master
let ws: WebSocket | null = null;
let wsConnected = false;

function connectToMaster() {
	const master = getMasterUrl();
	if (!master) {
		console.log('[telegram] Master not found, retrying in 10s...');
		setTimeout(connectToMaster, 10000);
		return;
	}

	ws = new WebSocket(master.ws);

	ws.on('open', () => {
		console.log('[telegram] Connected to Master');
		wsConnected = true;

		// Register
		ws!.send(JSON.stringify({
			id: makeId(), from: DAEMON_ID, to: 'master',
			type: 'register',
			payload: { name: 'P10 Telegram Bot', type: 'custom', capabilities: ['chat.telegram', 'notify'] },
			timestamp: new Date().toISOString()
		}));

		// Start heartbeat
		setInterval(() => {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({
					id: makeId(), from: DAEMON_ID, to: 'master',
					type: 'heartbeat',
					payload: { status: 'alive', tldr: `Telegram bot, ${ALLOWED_USERS.length || 'no'} allowed users` },
					timestamp: new Date().toISOString()
				}));
			}
		}, 5000);
	});

	ws.on('message', (data: Buffer) => {
		try {
			const msg = JSON.parse(data.toString());
			handleMeshMessage(msg);
		} catch { /* ignore */ }
	});

	ws.on('close', () => {
		wsConnected = false;
		console.log('[telegram] Disconnected, reconnecting...');
		setTimeout(connectToMaster, 5000);
	});

	ws.on('error', () => { /* will trigger close */ });
}

// Handle messages from the mesh
function handleMeshMessage(msg: any) {
	if (msg.type === 'register_ack') {
		console.log(`[telegram] Registered as ${msg.payload?.id}`);
	}

	// Handle task results routed back from Master
	if (msg.type === 'task_result' && msg.payload?.origin?.channel === 'telegram') {
		const chatId = msg.payload.origin.channelId;
		const result = msg.payload.result;
		let text: string;

		if (result?.error) {
			text = `❌ Task failed: ${result.error}`;
		} else if (result?.success) {
			const resultText = result.result || 'Task completed';
			text = `✅ Done:\n${resultText.slice(0, 3000)}`;
		} else {
			text = `📋 Result: ${JSON.stringify(result).slice(0, 3000)}`;
		}

		bot.sendMessage(Number(chatId), text).catch(() => {
			console.log(`[telegram] Failed to send result to chat ${chatId}`);
		});
	}
}

// Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/register/, async (msg) => {
	const user = msg.from!;
	const name = user.first_name + (user.last_name ? ' ' + user.last_name : '');

	// Register with Master's integration manager
	try {
		const result = await masterFetch('/integrations/telegram/register', {
			method: 'POST',
			body: JSON.stringify({ userId: user.id, name })
		});
		bot.sendMessage(msg.chat.id,
			`👋 Hello ${name}!\n\n` +
			`Your Telegram ID: \`${user.id}\`\n\n` +
			result.message + '\n\n' +
			'You can now:\n' +
			'/status — Mesh status\n' +
			'/debug — Debug snapshot\n' +
			'/task <instruction> — Send coding task\n' +
			'/query <question> — Query daemons\n' +
			'Or just send a message!',
			{ parse_mode: 'Markdown' }
		);

		// Update local allowed users list
		if (!ALLOWED_USERS.includes(user.id)) {
			ALLOWED_USERS.push(user.id);
		}
	} catch (err: any) {
		bot.sendMessage(msg.chat.id, `❌ Registration failed: ${err.message}`);
	}
});

bot.onText(/\/start/, (msg) => {
	if (!isAllowed(msg.from!.id)) {
		bot.sendMessage(msg.chat.id, '⛔ Not authorized. Add your user ID to P10_ALLOWED_USERS.');
		return;
	}
	bot.sendMessage(msg.chat.id, 
		'🔗 *P10 Development Platform*\n\n' +
		'Commands:\n' +
		'/status — Mesh status\n' +
		'/board — Kanban task board\n' +
		'/add [title] — Add task to board\n' +
		'/debug — Debug snapshot\n' +
		'/task <instruction> — Send a coding task\n' +
		'/query <question> — Query a daemon\n\n' +
		'Or just send a message to chat with the agent.',
		{ parse_mode: 'Markdown' }
	);
});

bot.onText(/\/status/, async (msg) => {
	if (!isAllowed(msg.from!.id)) return;
	try {
		const data = await masterFetch('/status');
		const lines = data.daemons.map((d: any) =>
			`${d.status === 'alive' ? '🟢' : '🔴'} ${d.name}: ${d.tldr}`
		);
		bot.sendMessage(msg.chat.id,
			`*Mesh Status* (${data.daemons.length} daemons)\n\n${lines.join('\n')}\n\n_${data.systemTldr}_`,
			{ parse_mode: 'Markdown' }
		);
	} catch (err: any) {
		bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
	}
});

bot.onText(/\/board/, async (msg) => {
	if (!isAllowed(msg.from!.id)) return;
	try {
		const data = await masterFetch('/board');
		const cols = ['planned', 'in-progress', 'done', 'failed', 'blocked'] as const;
		const icons: Record<string, string> = {
			'planned': '📋', 'in-progress': '▶️', 'done': '✅', 'failed': '❌', 'blocked': '⚠️'
		};
		const sections: string[] = [`📊 *Board* (${data.stats?.total || 0} tasks)`, ''];
		for (const col of cols) {
			const tasks = data[col] || [];
			if (tasks.length === 0) continue;
			sections.push(`${icons[col]} *${col}* (${tasks.length})`);
			for (const t of tasks) {
				const prio = t.priority === 'urgent' ? '🔴 ' : t.priority === 'high' ? '🟠 ' : '';
				sections.push(`  ${prio}${t.title.slice(0, 60)}`);
			}
			sections.push('');
		}
		if (data.stats?.total === 0) sections.push('Board is empty.');
		bot.sendMessage(msg.chat.id, sections.join('\n'), { parse_mode: 'Markdown' });
	} catch (err: any) {
		bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
	}
});

bot.onText(/\/debug/, async (msg) => {
	if (!isAllowed(msg.from!.id)) return;
	try {
		const resp = await fetch('http://localhost:3333/api/debug');
		const data = await resp.json();
		const s = data.snapshot || {};
		bot.sendMessage(msg.chat.id,
			`*Debug Snapshot*\n\n` +
			`TLDR: ${s.tldr || 'no data'}\n` +
			`Container: ${s.container?.status || '?'}\n` +
			`Servers: ${s.container?.servers?.length || 0}\n` +
			`Routes: ${s.apiExplorer?.discoveredRoutes?.length || 0}\n` +
			`Errors: ${s.errors?.length || 0}`,
			{ parse_mode: 'Markdown' }
		);
	} catch (err: any) {
		bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
	}
});

bot.onText(/\/task (.+)/, async (msg, match) => {
	if (!isAllowed(msg.from!.id)) return;
	const instruction = match![1];
	try {
		const data = await masterFetch('/task', {
			method: 'POST',
			body: JSON.stringify({ instruction, from: `telegram:${msg.from!.id}` }),
		});
		bot.sendMessage(msg.chat.id,
			data.routed
				? `✅ Task sent: "${instruction.slice(0, 80)}"`
				: `❌ Blocked: ${data.blocked}`
		);
	} catch (err: any) {
		bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
	}
});

bot.onText(/\/query (.+)/, async (msg, match) => {
	if (!isAllowed(msg.from!.id)) return;
	const question = match![1];
	try {
		bot.sendMessage(msg.chat.id, '🔍 Querying...');
		const data = await masterFetch('/query', {
			method: 'POST',
			body: JSON.stringify({ question }),
		});
		let answer = data.answer || data.error || 'No response';
		if (answer.length > 4000) answer = answer.slice(0, 4000) + '...';
		bot.sendMessage(msg.chat.id, answer);
	} catch (err: any) {
		bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
	}
});

// --- Guided /add flow ---
// Tracks per-chat conversation state for multi-step task creation
const addFlows = new Map<number, { step: 'title' | 'description' | 'priority'; title?: string; description?: string }>();

bot.onText(/\/add(?:\s+(.+))?/, async (msg, match) => {
	if (!isAllowed(msg.from!.id)) return;
	const inlineTitle = match?.[1]?.trim();

	if (inlineTitle) {
		// Quick mode: /add <title> — skip the flow
		addFlows.set(msg.chat.id, { step: 'description', title: inlineTitle });
		bot.sendMessage(msg.chat.id,
			`📋 *"${inlineTitle}"*\n\nAny more context? (or send \`-\` to skip)`,
			{ parse_mode: 'Markdown' }
		);
	} else {
		// Start guided flow
		addFlows.set(msg.chat.id, { step: 'title' });
		bot.sendMessage(msg.chat.id, '📋 *Add Task*\n\n1/3 What needs to be done?', { parse_mode: 'Markdown' });
	}
});

function handleAddFlow(msg: TelegramBot.Message): boolean {
	const flow = addFlows.get(msg.chat.id);
	if (!flow || !msg.text) return false;

	const text = msg.text.trim();

	switch (flow.step) {
		case 'title': {
			flow.title = text;
			flow.step = 'description';
			bot.sendMessage(msg.chat.id, '2/3 Why / more context? (or send `-` to skip)');
			return true;
		}
		case 'description': {
			if (text !== '-') flow.description = text;
			flow.step = 'priority';
			bot.sendMessage(msg.chat.id, '3/3 Priority? (low / normal / high / urgent)', {
				reply_markup: {
					keyboard: [[{ text: 'low' }, { text: 'normal' }, { text: 'high' }, { text: 'urgent' }]],
					one_time_keyboard: true,
					resize_keyboard: true,
				}
			});
			return true;
		}
		case 'priority': {
			const priority = ['low', 'normal', 'high', 'urgent'].includes(text) ? text : 'normal';
			addFlows.delete(msg.chat.id);

			// Submit task to board
			const userName = msg.from?.first_name || String(msg.from?.id);
			masterFetch('/board/task', {
				method: 'POST',
				body: JSON.stringify({
					title: flow.title,
					description: flow.description,
					humanCreated: true,
					priority,
					origin: { channel: 'telegram', userId: String(msg.from!.id), userName },
				}),
			}).then((data) => {
				const prio = priority === 'urgent' ? '🔴 ' : priority === 'high' ? '🟠 ' : '';
				bot.sendMessage(msg.chat.id,
					`✅ Task added: ${prio}*${flow.title}*${flow.description ? '\n' + flow.description : ''}\n\n_AI will analyze in ~10s_`,
					{ parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
				);
			}).catch(() => {
				bot.sendMessage(msg.chat.id, '❌ Could not add task', { reply_markup: { remove_keyboard: true } });
			});
			return true;
		}
	}
	return false;
}

// Default: forward free-text messages as tasks
bot.on('message', (msg) => {
	if (!msg.text || msg.text.startsWith('/')) return;
	if (!isAllowed(msg.from!.id)) return;

	// Check if user is in a guided /add flow
	if (handleAddFlow(msg)) return;

	// Forward as a task to the mesh with origin tracking
	masterFetch('/task', {
		method: 'POST',
		body: JSON.stringify({
			instruction: msg.text,
			channel: 'telegram',
			channelId: String(msg.chat.id), // Chat ID for routing results back
			from: DAEMON_ID,
			userId: String(msg.from!.id),
			userName: msg.from!.first_name || String(msg.from!.id),
			target: '*',
		}),
	}).then((data) => {
		if (data.routed) {
			bot.sendMessage(msg.chat.id, `📋 Task queued: "${msg.text!.slice(0, 60)}"`);
		}
	}).catch(() => {
		bot.sendMessage(msg.chat.id, '❌ Could not reach mesh');
	});
});

// Start
console.log(`\n  ┌──────────────────────────────────────┐`);
console.log(`  │  P10 Telegram Bot Daemon              │`);
console.log(`  │  ID: ${DAEMON_ID.padEnd(31)}│`);
console.log(`  │  Allowed users: ${(ALLOWED_USERS.length || 'all').toString().padEnd(19)}│`);
console.log(`  └──────────────────────────────────────┘\n`);

connectToMaster();

function makeId(): string {
	return Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n[telegram] Shutting down...');
	bot.stopPolling();
	ws?.close();
	process.exit(0);
});
