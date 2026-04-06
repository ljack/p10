/**
 * P10 Telegram Bot Setup — interactive registration flow.
 * 
 * Usage: npx tsx src/setup.ts
 * 
 * Steps:
 * 1. Create a bot via @BotFather on Telegram (if you haven't)
 * 2. Paste your bot token here
 * 3. Send /register to your bot on Telegram
 * 4. Config is saved to config.json
 */

import TelegramBot from 'node-telegram-bot-api';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = join(__dirname, '..', 'config.json');

interface Config {
	botToken: string;
	botUsername: string;
	allowedUsers: Array<{ id: number; name: string; registeredAt: string }>;
}

function loadConfig(): Config | null {
	if (!existsSync(CONFIG_FILE)) return null;
	try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')); }
	catch { return null; }
}

function saveConfig(config: Config) {
	writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function ask(question: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function main() {
	console.log(`
  ┌──────────────────────────────────────┐
  │  P10 Telegram Bot Setup              │
  └──────────────────────────────────────┘
`);

	const existing = loadConfig();
	if (existing) {
		console.log(`  Existing config found:`);
		console.log(`    Bot: @${existing.botUsername}`);
		console.log(`    Users: ${existing.allowedUsers.map(u => u.name).join(', ') || 'none'}`);
		console.log();
		const action = await ask('  (r)econfigure, (a)dd user, or (q)uit? ');

		if (action === 'q') process.exit(0);
		if (action === 'a') {
			await addUser(existing);
			return;
		}
		// Fall through to reconfigure
	}

	// Step 1: Get bot token
	console.log(`  Step 1: Create a Telegram bot`);
	console.log(`  ─────────────────────────────`);
	console.log(`  1. Open Telegram and search for @BotFather`);
	console.log(`  2. Send /newbot and follow the prompts`);
	console.log(`  3. Copy the bot token (looks like 123456:ABC-DEF...)`);
	console.log();

	const token = await ask('  Paste your bot token: ');
	if (!token || !token.includes(':')) {
		console.log('  ❌ Invalid token format');
		process.exit(1);
	}

	// Verify token
	console.log('\n  Verifying token...');
	let bot: TelegramBot;
	let botInfo: TelegramBot.User;
	try {
		bot = new TelegramBot(token, { polling: false });
		botInfo = await bot.getMe();
		console.log(`  ✅ Bot verified: @${botInfo.username} (${botInfo.first_name})`);
	} catch (err: any) {
		console.log(`  ❌ Invalid token: ${err.message}`);
		process.exit(1);
	}

	// Step 2: Register user
	const config: Config = {
		botToken: token,
		botUsername: botInfo.username || '',
		allowedUsers: []
	};

	saveConfig(config);
	console.log(`\n  ✅ Token saved to config.json`);

	await addUser(config);
}

async function addUser(config: Config) {
	console.log(`\n  Step 2: Register your Telegram account`);
	console.log(`  ──────────────────────────────────────`);
	console.log(`  Open Telegram and send /register to @${config.botUsername}`);
	console.log(`  Waiting for registration...`);

	const bot = new TelegramBot(config.botToken, { polling: true });

	return new Promise<void>((resolve) => {
		bot.onText(/\/register/, async (msg) => {
			const user = msg.from!;
			const name = user.first_name + (user.last_name ? ' ' + user.last_name : '');

			// Check if already registered
			if (config.allowedUsers.some(u => u.id === user.id)) {
				bot.sendMessage(msg.chat.id, `✅ You're already registered, ${name}!`);
				console.log(`  ℹ️  ${name} (${user.id}) already registered`);
				return;
			}

			// Send confirmation
			bot.sendMessage(msg.chat.id,
				`👋 Hello ${name}!\n\n` +
				`Your Telegram ID: \`${user.id}\`\n\n` +
				`I'm registering you as a P10 operator. ` +
				`You'll be able to:\n` +
				`• Check build status with /status\n` +
				`• View debug info with /debug\n` +
				`• Send coding tasks with /task\n` +
				`• Query daemons with /query\n\n` +
				`✅ Registration complete!`,
				{ parse_mode: 'Markdown' }
			);

			// Save user
			config.allowedUsers.push({
				id: user.id,
				name,
				registeredAt: new Date().toISOString()
			});
			saveConfig(config);

			console.log(`\n  ✅ Registered: ${name} (ID: ${user.id})`);
			console.log(`\n  Setup complete! Start the bot with:`);
			console.log(`    cd p10-telegram && npx tsx src/index.ts`);
			console.log(`  Or include it in the mesh:`);
			console.log(`    TELEGRAM_BOT_TOKEN=${config.botToken} ./start-mesh.sh\n`);

			bot.stopPolling();
			resolve();
		});

		// Also handle /start for users who might do that first
		bot.onText(/\/start/, (msg) => {
			bot.sendMessage(msg.chat.id,
				`🔗 *P10 Telegram Setup*\n\n` +
				`Send /register to link your account.`,
				{ parse_mode: 'Markdown' }
			);
		});
	});
}

main().catch(console.error);
