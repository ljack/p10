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

// Handle messages from the mesh (e.g., notifications to send to Telegram)
function handleMeshMessage(msg: any) {
	if (msg.type === 'register_ack') {
		console.log(`[telegram] Registered as ${msg.payload?.id}`);
	}
	// Future: handle notifications from other daemons
	// e.g., "build complete", "error detected", etc.
}

// Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
	if (!isAllowed(msg.from!.id)) {
		bot.sendMessage(msg.chat.id, '⛔ Not authorized. Add your user ID to P10_ALLOWED_USERS.');
		return;
	}
	bot.sendMessage(msg.chat.id, 
		'🔗 *P10 Development Platform*\n\n' +
		'Commands:\n' +
		'/status — Mesh status\n' +
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

// Default: forward free-text messages as tasks
bot.on('message', (msg) => {
	if (!msg.text || msg.text.startsWith('/')) return;
	if (!isAllowed(msg.from!.id)) return;

	// Forward as a task to the mesh
	masterFetch('/task', {
		method: 'POST',
		body: JSON.stringify({
			instruction: msg.text,
			from: `telegram:${msg.from!.id}`,
			context: `Message from Telegram user ${msg.from!.first_name || msg.from!.id}`,
		}),
	}).then((data) => {
		if (data.routed) {
			bot.sendMessage(msg.chat.id, `📋 Task queued: "${msg.text!.slice(0, 60)}..."`);
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
