/**
 * Tool Executor — handles execution of tool blocks from the AI agent.
 * Extracted from ChatPanel to keep it focused on UI.
 */

import { getInstance, restartBackend } from '$lib/sandbox/container';
import { specManager } from '$lib/specs/specManager.svelte';
import { debugBus } from '$lib/debug/debugBus.svelte';
import { apiExplorer } from '$lib/stores/apiExplorer.svelte';

/** Canonical /_routes endpoint implementation for Express */
const ROUTES_SNIPPET = `
// P10: route discovery for API Explorer (do not modify)
app.get('/api/_routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((mw) => {
    if (mw.route) {
      const methods = Object.keys(mw.route.methods).map(m => m.toUpperCase());
      routes.push({ methods, path: mw.route.path });
    }
  });
  res.json(routes.filter(r => r.path !== '/api/_routes'));
});
`;

export interface ToolResult {
	name: string;
	path: string;
	result: string;
	isError: boolean;
}

/**
 * Execute a single tool call against the WebContainer or spec system.
 */
export async function executeTool(
	name: string,
	attrs: Record<string, string>,
	body: string
): Promise<string> {
	const container = getInstance();
	if (!container && name !== 'write_spec') return 'Error: WebContainer not ready';

	try {
		switch (name) {
			case 'write_spec': {
				const filename = attrs.filename;
				specManager.updateSpec(filename, body, 'draft');
				if (filename === 'PLAN.md') {
					specManager.parseTasks(body);
				}
				return `📋 Spec updated: ${filename} (${body.length} chars)`;
			}

			case 'write_file': {
				const path = attrs.path;
				const dir = path.split('/').slice(0, -1).join('/');
				if (dir) await container!.fs.mkdir(dir, { recursive: true });

				let content = body;

				// Ensure canonical /_routes in server/index.js
				if (path === 'server/index.js') {
					// Remove any agent-written /_routes
					content = content.replace(
						/\/\/ *(Auto-injected|Route|Routes|P10).*\n(app\.get\(['"]\/(api\/)?_routes['"][\s\S]*?\);\n)/g,
						''
					);
					content = content.replace(
						/app\.get\(['"]\/(api\/)?_routes['"][\s\S]*?\);\n/g,
						''
					);

					// Inject canonical version before app.listen
					const listenIdx = content.lastIndexOf('app.listen');
					if (listenIdx > 0) {
						content = content.slice(0, listenIdx) + ROUTES_SNIPPET + content.slice(listenIdx);
					} else {
						content += ROUTES_SNIPPET;
					}
					debugBus.log('event', 'agent', 'Ensured canonical /_routes in server/index.js');
				}

				await container!.fs.writeFile(path, content);
				return `✅ Written: ${path} (${content.length} bytes)`;
			}

			case 'read_file': {
				const content = await container!.fs.readFile(attrs.path, 'utf-8');
				return content;
			}

			case 'list_files': {
				const entries = await container!.fs.readdir(attrs.path || '.', {
					withFileTypes: true
				});
				return entries
					.filter((e) => e.name !== 'node_modules')
					.map((e) => (e.isDirectory() ? e.name + '/' : e.name))
					.join('\n');
			}

			case 'run_command': {
				const cmd = attrs.command;

				// Block server start commands
				if (
					cmd.includes('npm run dev') ||
					cmd.includes('npm start') ||
					cmd.includes('node server')
				) {
					return 'Skipped: dev servers are already running. No need to start them.';
				}

				const parts = cmd.split(' ');
				const proc = await container!.spawn(parts[0], parts.slice(1));
				let output = '';
				proc.output.pipeTo(new WritableStream({ write(c) { output += c; } }));

				// Timeout after 30s
				const code = await Promise.race([
					proc.exit,
					new Promise<number>((resolve) =>
						setTimeout(() => {
							proc.kill();
							resolve(-1);
						}, 30000)
					)
				]);

				return code === -1
					? `Timeout (30s)\n${output}`
					: `Exit ${code}\n${output}`;
			}

			default:
				return `Unknown tool: ${name}`;
		}
	} catch (err) {
		return `Error: ${err instanceof Error ? err.message : String(err)}`;
	}
}

/**
 * Parse tool blocks from full response text.
 * Returns array of { name, attrs, body } for each tool block found.
 */
export function parseToolBlocks(
	fullText: string
): Array<{ name: string; attrs: Record<string, string>; body: string }> {
	const toolRegex =
		/<tool:(\w+)((?:\s+\w+="[^"]*")*)(?:\s*\/>|>([\s\S]*?)<\/tool:\1>)/g;
	const results: Array<{ name: string; attrs: Record<string, string>; body: string }> = [];

	let match;
	while ((match = toolRegex.exec(fullText)) !== null) {
		const name = match[1];
		const attrsStr = match[2];
		const body = match[3] || '';

		const attrs: Record<string, string> = {};
		const attrRegex = /(\w+)="([^"]*)"/g;
		let attrMatch;
		while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
			attrs[attrMatch[1]] = attrMatch[2];
		}

		results.push({ name, attrs, body });
	}

	return results;
}

/**
 * Strip tool blocks from text for display (both complete and partial).
 */
export function stripToolBlocks(text: string): string {
	return text
		// Strip complete tool blocks
		.replace(/<tool:\w+(?:\s+\w+="[^"]*")*(?:\s*\/>|>[\s\S]*?<\/tool:\w+>)/g, '')
		// Strip incomplete/partial tool blocks (still streaming)
		.replace(/<tool:\w+(?:\s+\w+="[^"]*")*>[\s\S]*$/g, '')
		// Strip partial opening tag
		.replace(/<tool:[^>]*$/g, '')
		.trim();
}

/**
 * Check if server files were written and handle backend restart + API refresh.
 */
export async function handlePostToolExecution(fullText: string): Promise<void> {
	if (/<tool:write_file\s+path="server\//.test(fullText)) {
		try {
			await restartBackend();
			debugBus.log('event', 'agent', 'Backend restarted after server file change');
			setTimeout(() => apiExplorer.triggerRefresh(), 3000);
		} catch (err) {
			debugBus.log('warn', 'agent', `Backend restart failed: ${err}`);
		}
	}
}
