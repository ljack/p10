/**
 * Integration Manager — handles setup and lifecycle of channel integrations (Telegram, etc.)
 * 
 * The Master orchestrates integration setup:
 * 1. Agent sends "setup telegram" task
 * 2. Master guides the user through token + registration
 * 3. Master spawns the integration daemon as a child process
 * 4. Integration daemon connects back to Master as a regular daemon
 */

import { spawn, type ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_DIR = join(import.meta.dirname, '..', '..');
const INTEGRATIONS_CONFIG = join(BASE_DIR, 'p10-master', 'integrations.json');

export interface IntegrationConfig {
	telegram?: {
		botToken: string;
		botUsername: string;
		allowedUsers: Array<{ id: number; name: string; registeredAt: string }>;
		status: 'setup' | 'awaiting_registration' | 'active' | 'stopped';
	};
}

export interface SetupState {
	step: string;
	pendingInput?: string;
	responseCallback?: (response: string) => void;
}

export class IntegrationManager {
	private config: IntegrationConfig = {};
	private processes = new Map<string, ChildProcess>();
	private setupStates = new Map<string, SetupState>();

	constructor() {
		this.loadConfig();
	}

	private loadConfig() {
		if (existsSync(INTEGRATIONS_CONFIG)) {
			try { this.config = JSON.parse(readFileSync(INTEGRATIONS_CONFIG, 'utf-8')); }
			catch { this.config = {}; }
		}
	}

	private saveConfig() {
		writeFileSync(INTEGRATIONS_CONFIG, JSON.stringify(this.config, null, 2));
	}

	getConfig(): IntegrationConfig {
		return this.config;
	}

	/** Start Telegram setup flow — returns instructions for the user */
	startTelegramSetup(): { step: string; message: string } {
		if (this.config.telegram?.status === 'active') {
			return { step: 'already_active', message: `Telegram is already connected (@${this.config.telegram.botUsername}). Use /integrations/telegram/restart to restart.` };
		}

		this.setupStates.set('telegram', { step: 'awaiting_token' });

		return {
			step: 'awaiting_token',
			message: [
				'**Telegram Setup — Step 1/2**',
				'',
				'1. Open Telegram and search for @BotFather',
				'2. Send `/newbot` and follow the prompts',
				'3. Copy the bot token (looks like `123456:ABC-DEF...`)',
				'',
				'Then call `POST /integrations/telegram/token` with `{"token": "your-token"}` or tell your agent to provide the token.'
			].join('\n')
		};
	}

	/** Receive the bot token — verifies and starts awaiting user registration */
	async setTelegramToken(token: string): Promise<{ step: string; message: string }> {
		// Verify token by calling Telegram API
		try {
			const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
			const data = await resp.json();

			if (!data.ok) {
				return { step: 'error', message: `Invalid token: ${data.description}` };
			}

			const botUsername = data.result.username;

			this.config.telegram = {
				botToken: token,
				botUsername,
				allowedUsers: [],
				status: 'awaiting_registration'
			};
			this.saveConfig();

			// Also save to p10-telegram/config.json for the bot process
			const telegramConfig = join(BASE_DIR, 'p10-telegram', 'config.json');
			writeFileSync(telegramConfig, JSON.stringify({
				botToken: token,
				botUsername,
				allowedUsers: []
			}, null, 2));

			// Start the bot process so it can receive /register
			this.startTelegramProcess();

			this.setupStates.set('telegram', { step: 'awaiting_registration' });

			return {
				step: 'awaiting_registration',
				message: [
					'**Telegram Setup — Step 2/2**',
					'',
					`✅ Bot verified: @${botUsername}`,
					'',
					`Now open Telegram and send \`/register\` to @${botUsername}`,
					'',
					'The bot is listening for your registration...'
				].join('\n')
			};
		} catch (err: any) {
			return { step: 'error', message: `Failed to verify token: ${err.message}` };
		}
	}

	/** Register a Telegram user (called by the Telegram bot when it receives /register) */
	registerTelegramUser(userId: number, name: string): { message: string } {
		if (!this.config.telegram) {
			return { message: 'Telegram not configured' };
		}

		if (this.config.telegram.allowedUsers.some(u => u.id === userId)) {
			return { message: `${name} is already registered` };
		}

		this.config.telegram.allowedUsers.push({
			id: userId,
			name,
			registeredAt: new Date().toISOString()
		});
		this.config.telegram.status = 'active';
		this.saveConfig();

		// Update p10-telegram/config.json
		const telegramConfig = join(BASE_DIR, 'p10-telegram', 'config.json');
		writeFileSync(telegramConfig, JSON.stringify({
			botToken: this.config.telegram.botToken,
			botUsername: this.config.telegram.botUsername,
			allowedUsers: this.config.telegram.allowedUsers
		}, null, 2));

		this.setupStates.delete('telegram');

		console.log(`[integrations] Telegram user registered: ${name} (${userId})`);

		return {
			message: `✅ ${name} registered! Telegram integration is now active.`
		};
	}

	/** Start the Telegram bot as a child process */
	startTelegramProcess() {
		if (this.processes.has('telegram')) {
			this.processes.get('telegram')!.kill();
		}

		const telegramDir = join(BASE_DIR, 'p10-telegram');
		const proc = spawn('npx', ['tsx', 'src/index.ts'], {
			cwd: telegramDir,
			stdio: ['pipe', 'pipe', 'pipe'],
			env: { ...process.env }
		});

		proc.stdout?.on('data', (data: Buffer) => {
			console.log(`[telegram] ${data.toString().trim()}`);
		});
		proc.stderr?.on('data', (data: Buffer) => {
			console.error(`[telegram:err] ${data.toString().trim()}`);
		});
		proc.on('exit', (code) => {
			console.log(`[telegram] Process exited with code ${code}`);
			this.processes.delete('telegram');
		});

		this.processes.set('telegram', proc);
		console.log('[integrations] Telegram bot process started');
	}

	/** Stop the Telegram bot */
	stopTelegramProcess() {
		const proc = this.processes.get('telegram');
		if (proc) {
			proc.kill();
			this.processes.delete('telegram');
		}
	}

	/** Auto-start active integrations on master boot */
	autoStart() {
		if (this.config.telegram?.status === 'active' || this.config.telegram?.status === 'awaiting_registration') {
			console.log('[integrations] Auto-starting Telegram bot...');
			this.startTelegramProcess();
		}
	}

	/** Stop all integration processes */
	stopAll() {
		for (const [name, proc] of this.processes) {
			console.log(`[integrations] Stopping ${name}...`);
			proc.kill();
		}
		this.processes.clear();
	}

	getSetupState(integration: string): SetupState | undefined {
		return this.setupStates.get(integration);
	}
}
