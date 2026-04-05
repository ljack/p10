/**
 * Chat Commands — special commands that users can type in the chat.
 * Commands start with / and are handled locally without sending to the LLM.
 */

import { browserDaemon } from '$lib/daemon/browserDaemon.svelte';
import { debugBus } from '$lib/debug/debugBus.svelte';

export interface CommandResult {
	handled: boolean;
	response?: string;
}

const commands: Record<string, {
	description: string;
	handler: (args: string) => Promise<string>;
}> = {
	help: {
		description: 'Show available commands',
		handler: async () => {
			const lines = Object.entries(commands).map(
				([name, cmd]) => `  /${name} — ${cmd.description}`
			);
			return '**Available commands:**\n' + lines.join('\n');
		}
	},
	mesh: {
		description: 'Show daemon mesh status',
		handler: async () => {
			if (!browserDaemon.connected) {
				return '○ **Mesh offline**\n\nStart the mesh: `./start-mesh.sh`';
			}
			try {
				const resp = await fetch('http://localhost:7777/status');
				const data = await resp.json();
				const lines = data.daemons.map(
					(d: any) => `  ${d.status === 'alive' ? '🟢' : '🔴'} **${d.name}** (${d.type}) — ${d.tldr}`
				);
				return `**Daemon Mesh** (${data.daemons.length} daemon(s))\n\n${lines.join('\n')}\n\n**System TLDR:** ${data.systemTldr}`;
			} catch {
				return '❌ Could not reach Master Daemon';
			}
		}
	},
	debug: {
		description: 'Show debug snapshot (TLDR)',
		handler: async () => {
			try {
				const resp = await fetch('/api/debug');
				const data = await resp.json();
				return `**Debug Snapshot**\n\n**TLDR:** ${data.snapshot?.tldr || 'no snapshot'}\n\n**Recent log:**\n\`\`\`\n${data.recentLog?.split('\n').slice(-10).join('\n') || '(empty)'}\n\`\`\``;
			} catch {
				return '❌ Debug endpoint unavailable';
			}
		}
	},
	clear: {
		description: 'Clear chat history',
		handler: async () => {
			return '__CLEAR__'; // Special signal handled by ChatPanel
		}
	},
	task: {
		description: 'Send a task to the Pi Daemon (e.g., /task fix the build error)',
		handler: async (args) => {
			if (!args.trim()) return '⚠️ Usage: `/task <instruction>`';
			if (!browserDaemon.connected) return '○ Mesh offline — start with `./start-mesh.sh`';

			browserDaemon.send('*', 'task', {
				taskId: `manual-${Date.now()}`,
				instruction: args.trim(),
				priority: 'normal'
			});
			return `📋 Task sent to mesh: "${args.trim()}"`;
		}
	},
	query: {
		description: 'Query a daemon (e.g., /query what errors are there?)',
		handler: async (args) => {
			if (!args.trim()) return '⚠️ Usage: `/query <question>`';
			if (!browserDaemon.connected) return '○ Mesh offline';

			try {
				const answer = await browserDaemon.query('*', args.trim());
				return `**Query response:**\n${answer}`;
			} catch {
				return '❌ Query timed out — no daemon responded';
			}
		}
	}
};

/**
 * Try to handle a chat message as a command.
 * Returns { handled: true, response } if it was a command.
 */
export async function handleCommand(input: string): Promise<CommandResult> {
	if (!input.startsWith('/')) return { handled: false };

	const spaceIdx = input.indexOf(' ');
	const cmdName = spaceIdx > 0 ? input.slice(1, spaceIdx) : input.slice(1);
	const args = spaceIdx > 0 ? input.slice(spaceIdx + 1) : '';

	const command = commands[cmdName];
	if (!command) {
		return {
			handled: true,
			response: `Unknown command: \`/${cmdName}\`. Type \`/help\` for available commands.`
		};
	}

	try {
		debugBus.log('event', 'chat', `Command: /${cmdName} ${args.slice(0, 50)}`);
		const response = await command.handler(args);
		return { handled: true, response };
	} catch (err) {
		return {
			handled: true,
			response: `❌ Command failed: ${err instanceof Error ? err.message : String(err)}`
		};
	}
}
