/**
 * Tool Executor — handles execution of tool blocks from the AI agent.
 * Extracted from ChatPanel to keep it focused on UI.
 */

import { getInstance, restartBackend } from '$lib/sandbox/container';
import { specManager, type PlanTask } from '$lib/specs/specManager.svelte';
import { debugBus } from '$lib/debug/debugBus.svelte';
import { apiExplorer } from '$lib/stores/apiExplorer.svelte';
import { activeProject } from '$lib/stores/project.svelte';

/** Push PLAN.md tasks to the kanban board via Master Daemon */
async function syncPlanTasksToBoard(tasks: PlanTask[]) {
	for (const task of tasks) {
		try {
			const url = activeProject.isActive ? `${activeProject.apiBase}/board/task` : '/api/board';
			await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: task.title,
					description: task.description || undefined,
					scope: 'project',
					origin: { channel: 'browser-chat', userName: 'agent' },
					priority: 'normal',
					tags: task.description ? [task.description.replace('From: ', '')] : undefined,
					humanCreated: false,
				}),
			});
		} catch (err) {
			debugBus.log('warn', 'toolExecutor', `Failed to sync task to board: ${task.title}`);
		}
	}
	debugBus.log('event', 'toolExecutor', `Synced ${tasks.length} PLAN.md tasks to board`);
}

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

/** Robust server startup that handles port conflicts */
const SERVER_STARTUP_SNIPPET = `
const BASE_PORT = 3001;
const MAX_PORT_ATTEMPTS = 10;

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;

    function tryPort(currentPort) {
      if (attempts >= MAX_PORT_ATTEMPTS) {
        reject(new Error('No available ports found after ' + MAX_PORT_ATTEMPTS + ' attempts'));
        return;
      }

      const server = app.listen(currentPort, () => {
        console.log('API server running on http://localhost:' + currentPort);
        resolve({ server, port: currentPort });
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          console.log('Port ' + currentPort + ' in use, trying port ' + (currentPort + 1) + '...');
          tryPort(currentPort + 1);
        } else {
          console.error('Server error:', err);
          reject(err);
        }
      });
    }

    tryPort(port);
  });
}

// Start the server and handle port conflicts gracefully
findAvailablePort(BASE_PORT)
  .then(({ server, port }) => {
    console.log('Server successfully started on port', port);
    if (port !== BASE_PORT) {
      console.log('WARNING: Using port ' + port + ' instead of ' + BASE_PORT + ' due to port conflict');
    }
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
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
				// Update spec and sync to container file system
				specManager.updateSpecWithSync(filename, body, 'draft');
				if (filename === 'PLAN.md') {
					const tasks = specManager.parseTasks(body);
					// Push unchecked tasks to the kanban board
					const todoTasks = tasks.filter(t => t.status === 'todo');
					if (todoTasks.length > 0) {
						await syncPlanTasksToBoard(todoTasks);
					}
				}
				return `📋 Spec updated & saved: ${filename} (${body.length} chars)${filename === 'PLAN.md' ? ` — ${specManager.tasks.filter(t => t.status === 'todo').length} tasks added to board` : ''}`;
			}

			case 'write_file': {
				const path = attrs.path;
				const dir = path.split('/').slice(0, -1).join('/');
				if (dir) await container!.fs.mkdir(dir, { recursive: true });

				let content = body;

				// Ensure canonical /_routes and robust server startup in server/index.js
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

					// Remove any problematic server startup code
					content = content.replace(
						/\/\/ *Start.*server.*[\s\S]*?process\.exit\(1\);/g,
						''
					);
					content = content.replace(
						/function startServer[\s\S]*?}[\s\S]*?startServer\([\s\S]*?;/g,
						''
					);
					content = content.replace(
						/app\.listen\([\s\S]*?;/g,
						''
					);
					content = content.replace(
						/setTimeout\([\s\S]*?startServer[\s\S]*?\);/g,
						''
					);

					// Add canonical /_routes and robust server startup
					content = content.trim() + ROUTES_SNIPPET + SERVER_STARTUP_SNIPPET;
					debugBus.log('event', 'agent', 'Fixed server startup with proper EADDRINUSE handling');
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
		// Strip complete tool blocks (handles both double and single quotes, and spaces before >)
		.replace(/<tool:\w+(?:\s+\w+=(?:"[^"]*"|'[^']*'))*(?:\s*\/>|\s*>[\s\S]*?<\/tool:\w+>)/g, '')
		// Strip incomplete/partial tool blocks (still streaming)
		.replace(/<tool:\w+(?:\s+\w+=(?:"[^"]*"|'[^']*'))*\s*>[\s\S]*$/g, '')
		// Strip partial opening tag
		.replace(/<tool:[^>]*$/g, '')
		// Collapse 3 or more consecutive newlines (even with spaces/CRs between) into exactly 2 newlines (one empty line)
		.replace(/\n(?:\s*\n){2,}/g, '\n\n')
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
