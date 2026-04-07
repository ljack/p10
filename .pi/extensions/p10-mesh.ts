/**
 * P10 Mesh Extension for pi
 * 
 * Connects this pi session to the P10 daemon mesh via the Master Daemon's REST API.
 * Provides custom tools for querying daemons, sending tasks, and checking mesh status.
 * 
 * The extension auto-discovers the Master Daemon from /tmp/p10-master.json.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text, Container, Spacer } from "@mariozechner/pi-tui";
import { readFileSync, writeFileSync, existsSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";

// --- Activity Feed Config ---

type ActivityVerbosity = 'off' | 'minimal' | 'normal' | 'verbose';

const CONFIG_PATH = join(homedir(), '.pi', 'p10-mesh.json');

function loadConfig(): { activityFeed: ActivityVerbosity } {
	try {
		if (existsSync(CONFIG_PATH)) {
			const data = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
			return { activityFeed: data.activityFeed || 'normal' };
		}
	} catch { /* ignore */ }
	return { activityFeed: 'normal' };
}

function saveConfig(config: { activityFeed: ActivityVerbosity }) {
	try {
		writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
	} catch { /* ignore */ }
}

let activityVerbosity: ActivityVerbosity = loadConfig().activityFeed;

function matchesVerbosity(eventType: string): boolean {
	if (activityVerbosity === 'off') return false;
	if (activityVerbosity === 'verbose') return true;

	// minimal: only agent.* events
	if (activityVerbosity === 'minimal') {
		return eventType.startsWith('agent.');
	}

	// normal: agent events + pipeline progress + daemon join/leave
	return eventType.startsWith('agent.') ||
		eventType.startsWith('pipeline.') ||
		eventType.startsWith('mesh.daemon.') ||
		eventType.startsWith('mesh.pi.');
}

function formatActivityEvent(event: any): string {
	const t = event.type || '';
	const d = event.data || {};
	const agent = d.agentId ? `[${d.agentId}]` : `[${event.source}]`;

	switch (t) {
		case 'agent.task.started':
			return `🔄 ${agent} started: "${d.title || '?'}"${d.role ? ` (${d.role})` : ''}`;
		case 'agent.task.done':
			return `✅ ${agent} done: "${d.title || '?'}"`;
		case 'agent.task.failed':
			return `❌ ${agent} failed: "${d.title || '?'}" — ${d.error || 'unknown'}`;
		case 'agent.idle':
			return `💤 ${agent} idle (${d.taskCount || 0} tasks completed)`;
		case 'pipeline.started':
			return `🚀 Pipeline started: "${d.instruction?.slice(0, 60) || '?'}" (${d.taskCount} tasks)`;
		case 'pipeline.completed':
			return `${d.status === 'completed' ? '✅' : '❌'} Pipeline ${d.status}: ${d.completedTasks}/${d.totalTasks} tasks`;
		case 'mesh.daemon.joined':
			return `🟢 ${d.name || event.source} joined (${d.type || 'unknown'})`;
		case 'mesh.pi.joined':
			return `📱 Pi CLI session connected`;
		case 'mesh.pi.quit':
			return `📴 Pi CLI session disconnected (${d.duration || 0}s)`;
		case 'board.task.added':
			return `📋 Board: new task "${d.task?.title?.slice(0, 60) || '?'}"`;
		case 'board.task.moved':
			return `📋 Board: "${d.task?.title?.slice(0, 40) || '?'}" ${d.from} → ${d.to}`;
		default:
			return `📡 ${t} from ${event.source}`;
	}
}

const DISCOVERY_FILE = "/tmp/p10-master.json";

function getMasterUrl(): string | null {
	if (!existsSync(DISCOVERY_FILE)) return null;
	try {
		const data = JSON.parse(readFileSync(DISCOVERY_FILE, "utf-8"));
		return data.httpUrl || null;
	} catch {
		return null;
	}
}

// Generate a unique session ID for this pi CLI instance
const PI_SESSION_ID = `pi-cli-${process.pid}-${generateSlug()}`;

function generateSlug(): string {
	const adj = ['swift','calm','bold','keen','warm','cool','wild','wise','fair','fast','deep','rare','epic','vast','lucky','cozy'];
	const noun = ['fox','owl','lynx','wolf','bear','hawk','crow','deer','frog','seal','swan','puma','orca','raven','ember','spark'];
	return adj[Math.floor(Math.random() * adj.length)] + '-' + noun[Math.floor(Math.random() * noun.length)];
}

async function masterFetch(path: string, options?: RequestInit): Promise<any> {
	const url = getMasterUrl();
	if (!url) throw new Error("Master Daemon not running. Start with: ./start-mesh.sh");
	const resp = await fetch(`${url}${path}`, {
		...options,
		headers: { 
			"Content-Type": "application/json", 
			"X-Pi-Session-Id": PI_SESSION_ID,
			"User-Agent": `pi-cli/${process.pid}`,
			...options?.headers 
		},
	});
	return resp.json();
}

// --- Auto-start helpers ---

function getProjectDir(): string {
	// Extension lives at <project>/.pi/extensions/p10-mesh.ts
	// Use cwd as the project root (pi is launched from there)
	return process.cwd();
}

async function waitForHealth(url: string, timeoutMs: number = 10000): Promise<boolean> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const resp = await fetch(url);
			const data = await resp.json();
			if (data.status === "ok") return true;
		} catch { /* not ready yet */ }
		await new Promise(r => setTimeout(r, 500));
	}
	return false;
}

function spawnDetached(cmd: string, args: string[], cwd: string, logFile: string): void {
	const out = openSync(logFile, "w");
	const child = spawn(cmd, args, {
		cwd,
		detached: true,
		stdio: ["ignore", out, out],
		env: { ...process.env },
	});
	child.unref();
}

async function isPortListening(port: number): Promise<boolean> {
	try {
		const resp = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) });
		return resp.ok;
	} catch {
		return false;
	}
}

async function isPortInUse(port: number): Promise<boolean> {
	try {
		const resp = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(2000) });
		return true;
	} catch (err: any) {
		// If we get a connection refused, the port is free
		// If we get any other error (e.g. timeout, parse error), something is listening
		return err?.cause?.code !== 'ECONNREFUSED';
	}
}

async function autoStartMesh(ctx: any): Promise<boolean> {
	const projectDir = getProjectDir();

	// 1. Check if master is already running
	if (await isPortListening(7777)) return true;

	ctx.ui.notify("🚀 P10 mesh not running — auto-starting...", "info");

	// 2. Start Master Daemon
	const masterDir = join(projectDir, "p10-master");
	if (!existsSync(join(masterDir, "src/index.ts"))) {
		ctx.ui.notify("❌ p10-master not found at " + masterDir, "error");
		return false;
	}
	spawnDetached("npx", ["tsx", "src/index.ts"], masterDir, "/tmp/p10-master.log");

	if (!await waitForHealth("http://localhost:7777/health", 10000)) {
		ctx.ui.notify("❌ Master failed to start. Check /tmp/p10-master.log", "error");
		return false;
	}
	ctx.ui.notify("  ✅ Master daemon started (port 7777)", "info");

	// 3. Start Pi Daemon (check if one is already connected)
	const piDir = join(projectDir, "p10-pi-daemon");
	if (existsSync(join(piDir, "src/index.ts"))) {
		spawnDetached("npx", ["tsx", "src/index.ts"], piDir, "/tmp/p10-pi.log");
		ctx.ui.notify("  ✅ Pi daemon started", "info");
	}

	// 4. Start SvelteKit app (skip if port 3333 is already in use)
	const svelteDir = join(projectDir, "svelteapp");
	if (existsSync(join(svelteDir, "package.json"))) {
		if (await isPortInUse(3333)) {
			ctx.ui.notify("  ○ SvelteKit already running (port 3333)", "info");
		} else {
			spawnDetached("npx", ["vite", "dev", "--port", "3333"], svelteDir, "/tmp/vite.log");
			ctx.ui.notify("  ✅ SvelteKit app started (port 3333)", "info");
		}
	}

	// 5. Optional: Start Telegram Bot
	const tgDir = join(projectDir, "p10-telegram");
	if (existsSync(join(tgDir, "config.json")) || process.env.TELEGRAM_BOT_TOKEN) {
		spawnDetached("npx", ["tsx", "src/index.ts"], tgDir, "/tmp/p10-telegram.log");
		ctx.ui.notify("  ✅ Telegram bot started", "info");
	}

	return true;
}

// --- WebSocket daemon connection ---
// Makes this pi CLI session a fully addressable daemon in the mesh.

function makeId(): string {
	return Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

function formatUptime(seconds: number): string {
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const m = Math.floor(seconds / 60);
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	return `${h}h ${m % 60}m`;
}

let meshWs: WebSocket | null = null;
let meshHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
let meshReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let meshCtx: any = null; // store extension context for message handlers
let meshConnected = false;

// --- Status line ---

function updateStatusLine() {
	const ctx = meshCtx;
	if (!ctx) return;
	const theme = ctx.ui.theme;

	if (!meshConnected) {
		ctx.ui.setStatus("p10-mesh", theme.fg("dim", "P10 ○ offline"));
		return;
	}

	const slug = PI_SESSION_ID.split('-').slice(2).join('-'); // e.g. "32294-calm-fox"
	const dot = theme.fg("success", "●");
	const label = theme.fg("dim", ` P10 ${slug}`);
	ctx.ui.setStatus("p10-mesh", dot + label);
}

function getMasterWsUrl(): string | null {
	if (!existsSync(DISCOVERY_FILE)) return null;
	try {
		const data = JSON.parse(readFileSync(DISCOVERY_FILE, "utf-8"));
		return data.wsUrl || null;
	} catch {
		return null;
	}
}

function connectMeshWs(ctx: any) {
	const wsUrl = getMasterWsUrl();
	if (!wsUrl) return;

	meshCtx = ctx;

	try {
		meshWs = new WebSocket(wsUrl);

		meshWs.onopen = () => {
			// Register as a pi-cli daemon
			meshWs!.send(JSON.stringify({
				id: makeId(),
				from: PI_SESSION_ID,
				to: 'master',
				type: 'register',
				payload: {
					name: `Pi CLI (${PI_SESSION_ID.split('-').slice(2).join('-')})`,
					type: 'pi-cli',
					capabilities: ['chat.interactive', 'query.answer', 'notify.user'],
				},
				timestamp: new Date().toISOString(),
			}));

			// Start heartbeat
			meshHeartbeatTimer = setInterval(() => {
				if (meshWs?.readyState === WebSocket.OPEN) {
					meshWs.send(JSON.stringify({
						id: makeId(),
						from: PI_SESSION_ID,
						to: 'master',
						type: 'heartbeat',
						payload: {
							status: 'alive',
							tldr: `pi CLI interactive session (pid ${process.pid})`,
						},
						timestamp: new Date().toISOString(),
					}));
				}
			}, 5000);
		};

		meshWs.onmessage = (event) => {
			try {
				const msg = JSON.parse(String(event.data));
				handleMeshWsMessage(msg);
			} catch { /* ignore parse errors */ }
		};

		meshWs.onclose = () => {
			stopMeshHeartbeat();
			meshConnected = false;
			updateStatusLine();
			// Auto-reconnect after 5s
			if (!meshReconnectTimer) {
				meshReconnectTimer = setTimeout(() => {
					meshReconnectTimer = null;
					connectMeshWs(ctx);
				}, 5000);
			}
		};

		meshWs.onerror = () => {
			// onclose will fire after this
		};
	} catch { /* ignore connection errors */ }
}

function disconnectMeshWs() {
	stopMeshHeartbeat();
	if (meshReconnectTimer) {
		clearTimeout(meshReconnectTimer);
		meshReconnectTimer = null;
	}
	if (meshWs) {
		try { meshWs.close(); } catch { /* ignore */ }
		meshWs = null;
	}
}

function stopMeshHeartbeat() {
	if (meshHeartbeatTimer) {
		clearInterval(meshHeartbeatTimer);
		meshHeartbeatTimer = null;
	}
}

function sendMeshWs(to: string, type: string, payload: any) {
	if (meshWs?.readyState === WebSocket.OPEN) {
		meshWs.send(JSON.stringify({
			id: makeId(),
			from: PI_SESSION_ID,
			to,
			type,
			payload,
			timestamp: new Date().toISOString(),
		}));
	}
}

function handleMeshWsMessage(msg: any) {
	const ctx = meshCtx;
	if (!ctx) return;

	switch (msg.type) {
		case 'register_ack':
			meshConnected = true;
			updateStatusLine();
			break;

		case 'query': {
			// Someone is asking us a question — notify user
			const question = msg.payload?.question || 'unknown';
			ctx.ui.notify(`❓ Mesh query from ${msg.from}: ${question}`, "info");
			// Auto-respond with session info for status queries
			const q = question.toLowerCase();
			if (q.includes('status') || q.includes('state') || q.includes('alive')) {
				sendMeshWs(msg.from, 'query_response', {
					queryId: msg.payload?.queryId,
					answer: JSON.stringify({
						sessionId: PI_SESSION_ID,
						type: 'pi-cli',
						pid: process.pid,
						status: 'interactive session active',
					}),
				});
			}
			break;
		}

		case 'task': {
			// Someone sent a task to this CLI session — notify user
			const instruction = msg.payload?.instruction || 'unknown';
			ctx.ui.notify(`📋 Incoming mesh task from ${msg.from}: ${instruction.slice(0, 100)}`, "info");
			break;
		}

		case 'pipeline_progress': {
			const p = msg.payload;
			if (p) {
				const completed = p.tasks?.filter((t: any) => t.status === 'completed').length || 0;
				const active = p.tasks?.find((t: any) => t.status === 'active');
				if (active) {
					ctx.ui.notify(`🔄 Pipeline [${completed}/${p.totalTasks}]: ${active.role} — ${active.instruction.slice(0, 60)}`, "info");
				} else if (p.status === 'completed') {
					ctx.ui.notify(`✅ Pipeline completed: ${completed}/${p.totalTasks} tasks`, "info");
				} else if (p.status === 'failed') {
					ctx.ui.notify(`❌ Pipeline failed at task ${p.currentTaskIndex + 1}/${p.totalTasks}`, "warn");
				}
			}
			break;
		}

		case 'register': {
			const d = msg.payload?.daemon;
			if (d) ctx.ui.notify(`🟢 Daemon joined: ${d.name} (${d.type})`, "info");
			break;
		}

		case 'unregister': {
			ctx.ui.notify(`🔴 Daemon left: ${msg.payload?.id}`, "info");
			break;
		}

		case 'pong':
			// Heartbeat response — ignore silently
			break;

		case 'mesh_event':
		case 'event_notification': {
			const event = msg.payload;
			if (event?.type && matchesVerbosity(event.type)) {
				ctx.ui.notify(formatActivityEvent(event), "info");
			}
			break;
		}
	}
}

export default function (pi: ExtensionAPI) {
	// Notify on load — auto-start mesh if not running
	pi.on("session_start", async (_event, ctx) => {
		// Set initial status
		updateStatusLine();

		// Auto-start mesh servers if they're not running
		const meshReady = await autoStartMesh(ctx);

		if (meshReady) {
			try {
				const health = await masterFetch("/health");
				if (health.status === "ok") {
					// Connect as a WebSocket daemon for full addressability
					connectMeshWs(ctx);

					// Clean disconnect on exit
					const cleanup = () => {
						disconnectMeshWs();
						try {
							// Fire-and-forget REST quit notification as backup
							fetch(`${getMasterUrl()}/pi-quit`, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ sessionId: PI_SESSION_ID }),
							}).catch(() => {});
						} catch { /* ignore */ }
					};
					process.on('SIGINT', cleanup);
					process.on('SIGTERM', cleanup);
					process.on('beforeExit', cleanup);
				}
			} catch {
				ctx.ui.notify("○ P10 Mesh: master started but not responding", "warn");
			}
		} else {
			ctx.ui.notify("○ P10 Mesh offline — start manually with ./start-mesh.sh", "info");
		}
	});

	// --- Custom Tools ---

	pi.registerTool({
		name: "mesh_status",
		label: "Mesh Status",
		description: "Get the status of the P10 daemon mesh — shows all connected daemons, their heartbeat status, and system TLDR summary",
		parameters: Type.Object({}),
		async execute() {
			const data = await masterFetch("/status");
			const piSessions = data.piSessions || { activeSessions: 0, daemonStatus: 'unknown' };
			
			const lines = [
				`Master uptime: ${Math.round(data.master.uptime)}s`,
				`Daemons: ${data.daemons.length}`,
				"",
				...data.daemons.map((d: any) =>
					`${d.status === "alive" ? "🟢" : "🔴"} ${d.name} (${d.type}) — ${d.tldr}`
				),
				"",
				`Pi CLI Sessions: ${piSessions.activeSessions} active`,
				`Pi Daemon: ${piSessions.daemonStatus}`,
				"",
				`System TLDR: ${data.systemTldr}`,
			];
			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: { daemons: data.daemons, master: data.master, piSessions },
			};
		},

		renderResult(result, { expanded }, theme) {
			const d = result.details as any;
			if (!d?.daemons) return new Text(result.content[0]?.text || 'no data', 0, 0);

			const daemons: any[] = d.daemons;
			const master = d.master;

			// Deduplicate daemons by name (keep newest heartbeat)
			const seen = new Map<string, any>();
			for (const dm of daemons) {
				const existing = seen.get(dm.name);
				if (!existing || new Date(dm.lastHeartbeat) > new Date(existing.lastHeartbeat)) {
					seen.set(dm.name, dm);
				}
			}
			const unique = Array.from(seen.values());

			// Header
			const uptime = formatUptime(master.uptime);
			const header = theme.fg("accent", theme.bold("P10 Mesh"))
				+ theme.fg("dim", ` │ port ${master.port} │ up ${uptime} │ ${unique.length} daemon(s)`);

			const container = new Container();
			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			container.addChild(new Text(header, 1, 0));
			container.addChild(new Spacer(1));

			// Daemon rows
			for (const dm of unique) {
				const icon = dm.type === 'pi' ? '🤖' : dm.type === 'pi-cli' ? '💻' : dm.type === 'browser' ? '🌐' : '🔌';
				const dot = dm.status === 'alive' ? theme.fg("success", "●") : theme.fg("error", "●");
				const name = theme.fg("text", theme.bold(dm.name));
				const type = theme.fg("dim", dm.type);
				const tldr = theme.fg("muted", dm.tldr.slice(0, 60));

				const line = `  ${dot} ${icon} ${name} ${type}  ${tldr}`;
				container.addChild(new Text(line, 0, 0));

				// Show capabilities when expanded
				if (expanded && dm.capabilities?.length > 0) {
					const caps = dm.capabilities.map((c: string) => theme.fg("dim", c)).join(theme.fg("muted", " · "));
					container.addChild(new Text(`      ${caps}`, 0, 0));
				}
			}

			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			return container;
		},
	});

	pi.registerTool({
		name: "mesh_query",
		label: "Mesh Query",
		description: "Ask a question to daemons in the P10 mesh. Use target '*' to broadcast, or specify a daemon type like 'browser' or 'pi'. The query is answered by the first daemon that responds.",
		parameters: Type.Object({
			question: Type.String({ description: "The question to ask" }),
			target: Type.Optional(Type.String({ description: "Target daemon ID or '*' for broadcast. Default: '*'" })),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch("/query", {
				method: "POST",
				body: JSON.stringify({ question: params.question, target: params.target || "*" }),
			});
			let answer = data.answer;
			if (answer && typeof answer === "string") {
				try { answer = JSON.stringify(JSON.parse(answer), null, 2); } catch { /* keep as-is */ }
			}
			return {
				content: [{ type: "text", text: answer || data.error || "No response" }],
				details: {},
			};
		},
	});

	pi.registerTool({
		name: "mesh_task",
		label: "Mesh Task",
		description: "Send a coding task to a daemon in the P10 mesh. The Pi Daemon will use the pi SDK to execute it. Fire-and-forget — the task is queued and executed asynchronously.",
		parameters: Type.Object({
			instruction: Type.String({ description: "What to do — a coding task description" }),
			target: Type.Optional(Type.String({ description: "Target daemon. Default: '*' (any available)" })),
			context: Type.Optional(Type.String({ description: "Additional context for the task" })),
			priority: Type.Optional(Type.String({ description: "Priority: low, normal, high, urgent. Default: normal" })),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch("/task", {
				method: "POST",
				body: JSON.stringify({
					instruction: params.instruction,
					target: params.target || "*",
					context: params.context,
					priority: params.priority || "normal",
				}),
			});
			return {
				content: [{
					type: "text",
					text: data.routed
						? `✅ Task sent (${data.taskId}): "${params.instruction.slice(0, 80)}"`
						: `❌ Task blocked: ${data.blocked}`
				}],
				details: {},
			};
		},
	});

	pi.registerTool({
		name: "mesh_debug",
		label: "Mesh Debug",
		description: "Get the debug snapshot from the P10 browser app — includes container state, chat history summary, API explorer routes, errors, and a TLDR summary",
		parameters: Type.Object({}),
		async execute() {
			try {
				const resp = await fetch("http://localhost:3333/api/debug");
				const data = await resp.json();
				const s = data.snapshot || {};
				const lines = [
					`TLDR: ${s.tldr || "no snapshot"}`,
					`Container: ${s.container?.status || "?"} / ${s.container?.serverStatus || "?"}`,
					`Servers: ${s.container?.servers?.map((sv: any) => `${sv.type}:${sv.port}`).join(", ") || "none"}`,
					`Chat: ${s.chat?.messageCount || 0} messages, streaming: ${s.chat?.isStreaming || false}`,
					`API Routes: ${s.apiExplorer?.discoveredRoutes?.length || 0}`,
					`Errors: ${s.errors?.length || 0}${s.errors?.length > 0 ? " — " + s.errors[0]?.slice(0, 100) : ""}`,
					"",
					"Recent log:",
					data.recentLog?.split("\n").slice(-10).join("\n") || "(empty)",
				];
				return {
					content: [{ type: "text", text: lines.join("\n") }],
					details: {},
				};
			} catch {
				return {
					content: [{ type: "text", text: "P10 app not running at localhost:3333" }],
					details: {},
				};
			}
		},
	});

	pi.registerTool({
		name: "mesh_setup_telegram",
		label: "Setup Telegram",
		description: "Start the Telegram integration setup flow. Call this when the user wants to connect Telegram to the P10 mesh. Returns instructions for the next step.",
		parameters: Type.Object({
			token: Type.Optional(Type.String({ description: "Telegram bot token from @BotFather. If not provided, returns setup instructions." })),
		}),
		async execute(_toolCallId, params) {
			if (params.token) {
				const data = await masterFetch("/integrations/telegram/token", {
					method: "POST",
					body: JSON.stringify({ token: params.token }),
				});
				return { content: [{ type: "text", text: data.message }], details: {} };
			} else {
				const data = await masterFetch("/integrations/telegram/setup", { method: "POST" });
				return { content: [{ type: "text", text: data.message }], details: {} };
			}
		},
	});

	pi.registerTool({
		name: "mesh_pipeline",
		label: "Mesh Pipeline",
		description: "Launch a multi-agent pipeline on the P10 mesh. Decomposes an instruction into role-based tasks (api_agent, web_agent, review_agent) and executes them sequentially via the Pi Daemon. Returns immediately with the pipeline plan — execution happens asynchronously.",
		parameters: Type.Object({
			instruction: Type.String({ description: "What to build — e.g. 'Build auth with login and registration'" }),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch("/pipeline", {
				method: "POST",
				body: JSON.stringify({
					instruction: params.instruction,
					channel: 'pi-cli',
				}),
			});

			if (data.error) {
				return { content: [{ type: "text", text: `❌ Pipeline failed: ${data.error}` }], details: {} };
			}

			const lines = [
				`🚀 Pipeline created: ${data.pipelineId}`,
				`Approach: ${data.approach}`,
				`Tasks (${data.tasks.length}):`,
				"",
				...data.tasks.map((t: any, i: number) =>
					`  ${i + 1}. [${t.role}] ${t.instruction.slice(0, 80)}`
				),
				"",
				"Executing asynchronously. Check status with mesh_pipeline_status.",
			];
			return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
		},
	});

	pi.registerTool({
		name: "mesh_pipeline_status",
		label: "Pipeline Status",
		description: "Check the status of pipelines on the P10 mesh — shows active and recent pipelines with task progress.",
		parameters: Type.Object({
			pipelineId: Type.Optional(Type.String({ description: "Specific pipeline ID. If omitted, shows all active/recent pipelines." })),
		}),
		async execute(_toolCallId, params) {
			if (params.pipelineId) {
				const data = await masterFetch(`/pipeline/${params.pipelineId}`);
				if (data.error) {
					return { content: [{ type: "text", text: `❌ ${data.error}` }], details: {} };
				}
				const lines = [
					`Pipeline: ${data.id}`,
					`Instruction: "${data.instruction}"`,
					`Status: ${data.status}`,
					`Progress: ${data.currentTaskIndex + 1}/${data.tasks.length}`,
					"",
					...data.tasks.map((t: any) => {
						const icon = t.status === 'completed' ? '✅' :
							t.status === 'active' ? '🔄' :
							t.status === 'failed' ? '❌' :
							t.status === 'skipped' ? '⏭' : '○';
						let line = `  ${icon} [${t.role}] ${t.instruction.slice(0, 80)}`;
						if (t.result) line += `\n     → ${t.result.slice(0, 150)}`;
						return line;
					}),
				];
				return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
			} else {
				const data = await masterFetch("/pipelines");
				const lines = [
					`Active pipelines: ${data.active?.length || 0}`,
					`Recent pipelines: ${data.recent?.length || 0}`,
					"",
					...(data.active || []).map((p: any) =>
						`🔄 ${p.id}: "${p.instruction.slice(0, 60)}" — ${p.tasks.filter((t: any) => t.status === 'completed').length}/${p.tasks.length} tasks`
					),
					...(data.recent || []).filter((p: any) => p.status !== 'executing').map((p: any) =>
						`${p.status === 'completed' ? '✅' : '❌'} ${p.id}: "${p.instruction.slice(0, 60)}" — ${p.status}`
					),
				];
				return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
			}
		},
	});

	pi.registerTool({
		name: "mesh_pipeline_cancel",
		label: "Cancel Pipeline",
		description: "Cancel a running pipeline. The current task will finish, but remaining tasks will be skipped.",
		parameters: Type.Object({
			pipelineId: Type.String({ description: "Pipeline ID to cancel" }),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch(`/pipeline/${params.pipelineId}/cancel`, { method: "POST" });
			return {
				content: [{ type: "text", text: data.success ? `⛔ ${data.message}` : `❌ ${data.message}` }],
				details: {},
			};
		},
	});

	pi.registerTool({
		name: "mesh_pipeline_rerun",
		label: "Re-run Pipeline",
		description: "Re-run a failed or cancelled pipeline from the first non-completed task. Completed tasks are kept.",
		parameters: Type.Object({
			pipelineId: Type.String({ description: "Pipeline ID to re-run" }),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch(`/pipeline/${params.pipelineId}/rerun`, { method: "POST" });
			return {
				content: [{ type: "text", text: data.success ? `↻ ${data.message}` : `❌ ${data.message}` }],
				details: {},
			};
		},
	});

	// --- Autonomous Run tools ---

	pi.registerTool({
		name: "mesh_run",
		label: "Autonomous Run",
		description: "Start an autonomous development run. Reads PLAN.md tasks (or takes an instruction), decomposes each into pipelines, and executes them sequentially. Fire-and-forget — generates a morning report when done. This is P10's 'ship it by night' mode.",
		parameters: Type.Object({
			instruction: Type.String({ description: "What to build — e.g. 'Build everything in PLAN.md' or 'Build a todo app with auth'" }),
			planContent: Type.Optional(Type.String({ description: "Raw PLAN.md content. If provided, unchecked tasks are extracted and executed." })),
			planFile: Type.Optional(Type.String({ description: "Path to PLAN.md file on disk. Alternative to planContent." })),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch("/run", {
				method: "POST",
				body: JSON.stringify(params),
			});

			if (data.error) {
				return { content: [{ type: "text", text: `❌ Run failed: ${data.error}` }], details: {} };
			}

			const lines = [
				`🌙 Autonomous run started: ${data.runId}`,
				`Source: ${data.planSource}`,
				`Tasks (${data.taskCount}):`,
				"",
				...(data.tasks || []).map((t: any, i: number) =>
					`  ${i + 1}. [${t.phase}] ${t.title}`
				),
				"",
				"Running autonomously. Check status with mesh_run_status.",
				"Morning report will be generated when complete.",
			];
			return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
		},
	});

	pi.registerTool({
		name: "mesh_run_status",
		label: "Run Status",
		description: "Check the status of autonomous runs — shows active/recent runs with task progress and morning reports.",
		parameters: Type.Object({
			runId: Type.Optional(Type.String({ description: "Specific run ID. If omitted, shows all active/recent runs." })),
		}),
		async execute(_toolCallId, params) {
			if (params.runId) {
				const data = await masterFetch(`/run/${params.runId}`);
				if (data.error) {
					return { content: [{ type: "text", text: `❌ ${data.error}` }], details: {} };
				}
				// If there's a report, show it
				if (data.report) {
					return { content: [{ type: "text", text: data.report }], details: {} };
				}
				// Otherwise show progress
				const lines = [
					`Run: ${data.id}`,
					`Instruction: "${data.instruction}"`,
					`Status: ${data.status}`,
					`Progress: ${data.stats.completed}/${data.stats.totalTasks} completed, ${data.stats.failed} failed`,
					"",
					...data.tasks.map((t: any) => {
						const icon = t.status === 'completed' ? '✅' :
							t.status === 'running' ? '🔄' :
							t.status === 'failed' ? '❌' :
							t.status === 'skipped' ? '⏭' : '○';
						let line = `  ${icon} ${t.title}`;
						if (t.result) line += `\n     → ${t.result.slice(0, 150)}`;
						return line;
					}),
				];
				return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
			} else {
				const data = await masterFetch("/runs");
				const lines = [
					`Active runs: ${data.active?.length || 0}`,
					`Recent runs: ${data.recent?.length || 0}`,
					"",
					...(data.active || []).map((r: any) =>
						`${r.status === 'paused' ? '⏸' : '🌙'} ${r.id}: "${r.instruction.slice(0, 50)}" — ${r.stats.completed}/${r.stats.totalTasks} tasks`
					),
					...(data.recent || []).filter((r: any) => !['running','paused','preparing'].includes(r.status)).map((r: any) =>
						`${r.status === 'completed' ? '✅' : '❌'} ${r.id}: "${r.instruction.slice(0, 50)}" — ${r.status}`
					),
				];
				return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
			}
		},
	});

	pi.registerTool({
		name: "mesh_run_pause",
		label: "Pause Run",
		description: "Pause an autonomous run. Current pipeline will finish, then the run pauses.",
		parameters: Type.Object({
			runId: Type.String({ description: "Run ID to pause" }),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch(`/run/${params.runId}/pause`, { method: "POST" });
			return {
				content: [{ type: "text", text: data.success ? `⏸ ${data.message}` : `❌ ${data.message}` }],
				details: {},
			};
		},
	});

	pi.registerTool({
		name: "mesh_run_resume",
		label: "Resume Run",
		description: "Resume a paused autonomous run from where it left off.",
		parameters: Type.Object({
			runId: Type.String({ description: "Run ID to resume" }),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch(`/run/${params.runId}/resume`, { method: "POST" });
			return {
				content: [{ type: "text", text: data.success ? `▶ ${data.message}` : `❌ ${data.message}` }],
				details: {},
			};
		},
	});

	pi.registerTool({
		name: "mesh_run_cancel",
		label: "Cancel Run",
		description: "Cancel an autonomous run. Current task finishes, remaining tasks skipped.",
		parameters: Type.Object({
			runId: Type.String({ description: "Run ID to cancel" }),
		}),
		async execute(_toolCallId, params) {
			const data = await masterFetch(`/run/${params.runId}/cancel`, { method: "POST" });
			return {
				content: [{ type: "text", text: data.success ? `⛔ ${data.message}` : `❌ ${data.message}` }],
				details: {},
			};
		},
	});

	pi.registerTool({
		name: "mesh_board",
		label: "Mesh Board",
		description: "Get the kanban task board from the P10 mesh — shows tasks organized by column (planned, in-progress, done, failed, blocked) with stats",
		parameters: Type.Object({
			column: Type.Optional(Type.String({ description: "Filter to a specific column: planned, in-progress, done, failed, blocked. Omit for full board." })),
		}),
		async execute(_toolCallId, params) {
			try {
				const path = params.column ? `/board/column/${params.column}` : "/board";
				const data = await masterFetch(path);

				if (params.column) {
					// Single column response (array of tasks)
					const tasks = Array.isArray(data) ? data : [];
					const lines = [
						`${params.column}: ${tasks.length} task(s)`,
						"",
						...tasks.map((t: any) => {
							const prio = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : t.priority === 'low' ? '🔵' : '';
							return `${prio} ${t.title.slice(0, 80)}${t.assignedTo ? ` → ${t.assignedTo}` : ''}`;
						}),
					];
					return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
				}

				// Full board
				const cols = ['planned', 'in-progress', 'done', 'failed', 'blocked'] as const;
				const lines = [
					`Task Board (${data.stats?.total || 0} tasks)`,
					"",
				];

				for (const col of cols) {
					const tasks = data[col] || [];
					if (tasks.length === 0) continue;
					const icon = col === 'planned' ? '📋' : col === 'in-progress' ? '▶' : col === 'done' ? '✓' : col === 'failed' ? '✗' : '⚠';
					lines.push(`${icon} ${col} (${tasks.length}):`);
					for (const t of tasks) {
						const prio = t.priority === 'urgent' ? '🔴 ' : t.priority === 'high' ? '🟠 ' : t.priority === 'low' ? '🔵 ' : '';
						const origin = t.origin?.channel ? ` [${t.origin.channel}]` : '';
						const pipeline = t.pipelineId ? ' [pipeline]' : '';
						const scope = t.scope === 'platform' ? ' ⚙️' : '';
						lines.push(`  ${prio}${t.title.slice(0, 70)}${origin}${pipeline}${scope}`);
						// Show inline subtasks if present
						if (t.subtasks?.length) {
							for (const s of t.subtasks) {
								const sIcon = s.status === 'completed' ? '✅' :
									s.status === 'active' ? '🔄' :
									s.status === 'failed' ? '❌' :
									s.status === 'skipped' ? '⏭' : '○';
								lines.push(`     ${sIcon} [${s.role}] ${s.instruction.slice(0, 60)}`);
							}
						}
					}
					lines.push("");
				}

				if (data.stats?.total === 0) lines.push("Board is empty.");

				return {
					content: [{ type: "text", text: lines.join("\n") }],
					details: { board: data },
				};
			} catch (err: any) {
				return { content: [{ type: "text", text: `Error: ${err.message}` }], details: {} };
			}
		},

		renderResult(result, { expanded }, theme) {
			const board = (result.details as any)?.board;
			if (!board?.stats) return new Text(result.content[0]?.text || 'no data', 0, 0);

			const container = new Container();
			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

			const total = board.stats.total || 0;
			const header = theme.fg("accent", theme.bold("Task Board"))
				+ theme.fg("dim", ` │ ${total} task(s)`);
			container.addChild(new Text(header, 1, 0));
			container.addChild(new Spacer(1));

			const colConfig: Array<{ key: string; icon: string; label: string; color: string }> = [
				{ key: 'planned', icon: '○', label: 'Planned', color: 'muted' },
				{ key: 'in-progress', icon: '▶', label: 'In Progress', color: 'accent' },
				{ key: 'done', icon: '✓', label: 'Done', color: 'success' },
				{ key: 'failed', icon: '✗', label: 'Failed', color: 'error' },
				{ key: 'blocked', icon: '⚠', label: 'Blocked', color: 'warning' },
			];

			for (const col of colConfig) {
				const tasks = board[col.key] || [];
				if (tasks.length === 0) continue;

				const colHeader = theme.fg(col.color as any, `  ${col.icon} ${col.label} (${tasks.length})`);
				container.addChild(new Text(colHeader, 0, 0));

				for (const t of tasks) {
					const prio = t.priority === 'urgent' ? theme.fg('error', '● ') :
						t.priority === 'high' ? theme.fg('warning', '● ') : '  ';
					const title = theme.fg('text', t.title.slice(0, 60));
					const origin = t.origin?.channel ? theme.fg('dim', ` [${t.origin.channel}]`) : '';
					container.addChild(new Text(`    ${prio}${title}${origin}`, 0, 0));

					if (expanded && t.result) {
						container.addChild(new Text(theme.fg('dim', `      → ${t.result.slice(0, 100)}`), 0, 0));
					}
				}
			}

			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			return container;
		},
	});

	pi.registerTool({
		name: "mesh_add_task",
		label: "Add Board Task",
		description: "Add a new task to the P10 kanban board. Use for capturing ideas, TODOs, or planned work. Human-created tasks get auto-analyzed by AI after ~10s.",
		parameters: Type.Object({
			title: Type.String({ description: "Task title — what needs to be done" }),
			description: Type.Optional(Type.String({ description: "Additional context or details" })),
			priority: Type.Optional(Type.String({ description: "Priority: low, normal, high, urgent. Default: normal" })),
			tags: Type.Optional(Type.Array(Type.String(), { description: "Tags for categorization" })),
			scope: Type.Optional(Type.String({ description: "Scope: 'project' (default) or 'platform' (P10 system tasks)" })),
			humanCreated: Type.Optional(Type.Boolean({ description: "Whether this was from a human (triggers AI analysis). Default: true" })),
		}),
		async execute(_toolCallId, params) {
			try {
				const data = await masterFetch("/board/task", {
					method: "POST",
					body: JSON.stringify({
						title: params.title,
						description: params.description,
						priority: params.priority || 'normal',
						tags: params.tags,
						scope: params.scope || 'project',
						humanCreated: params.humanCreated !== false,
						origin: { channel: 'pi-cli', userName: 'user' },
					}),
				});
				const prio = data.priority === 'urgent' ? '🔴 ' : data.priority === 'high' ? '🟠 ' : '';
				return {
					content: [{ type: "text", text: `✅ Task added to board: ${prio}"${data.title}" (${data.id})\nAI analysis will run in ~10s.` }],
					details: {},
				};
			} catch (err: any) {
				return { content: [{ type: "text", text: `Error: ${err.message}` }], details: {} };
			}
		},
	});

	pi.registerTool({
		name: "mesh_messages",
		label: "Mesh Messages",
		description: "Get message history from the P10 mesh — shows tasks sent from all channels (Telegram, browser, CLI) with their status and results",
		parameters: Type.Object({
			channel: Type.Optional(Type.String({ description: "Filter by channel: telegram, browser-chat, rest-api. Leave empty for all." })),
		}),
		async execute(_toolCallId, params) {
			const path = params.channel ? `/messages/channel/${params.channel}` : "/messages";
			const data = await masterFetch(path);
			return {
				content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
				details: {},
			};
		},
	});

	// --- Commands ---

	pi.registerCommand("mesh", {
		description: "Show P10 mesh status",
		handler: async (_args, ctx) => {
			const url = getMasterUrl();
			if (!url) {
				ctx.ui.notify("○ Mesh offline. Run ./start-mesh.sh", "warn");
				return;
			}
			try {
				const data = await masterFetch("/status");
				const piSessions = data.piSessions || { activeSessions: 0, daemonStatus: 'unknown' };
				const lines = data.daemons.map((d: any) =>
					`  ${d.status === "alive" ? "🟢" : "🔴"} ${d.name}: ${d.tldr}`
				);
				const piInfo = `\n\n📱 Pi CLI Sessions: ${piSessions.activeSessions} active\n🔧 Pi Daemon: ${piSessions.daemonStatus}`;
				ctx.ui.notify(`🔗 Mesh: ${data.daemons.length} daemon(s)\n${lines.join("\n")}${piInfo}`, "info");
			} catch (err: any) {
				ctx.ui.notify(`❌ ${err.message}`, "error");
			}
		},
	});

	pi.registerCommand("p10", {
		description: "Show P10 debug snapshot (TLDR)",
		handler: async (_args, ctx) => {
			try {
				const resp = await fetch("http://localhost:3333/api/debug");
				const data = await resp.json();
				ctx.ui.notify(`📊 ${data.snapshot?.tldr || "No snapshot"}`, "info");
			} catch {
				ctx.ui.notify("P10 app not running", "warn");
			}
		},
	});

	pi.registerCommand("board", {
		description: "Show kanban task board",
		handler: async (_args, ctx) => {
			const url = getMasterUrl();
			if (!url) {
				ctx.ui.notify("○ Mesh offline. Run ./start-mesh.sh", "warn");
				return;
			}
			try {
				const data = await masterFetch("/board");
				const cols = ['planned', 'in-progress', 'done', 'failed', 'blocked'] as const;
				const colLabels: Record<string, string> = {
					'planned': '📋 Planned',
					'in-progress': '▶ In Progress',
					'done': '✓ Done',
					'failed': '✗ Failed',
					'blocked': '⚠ Blocked',
				};
				const sections: string[] = [`📊 Board (${data.stats?.total || 0} tasks)`, ''];
				for (const col of cols) {
					const tasks = data[col] || [];
					if (tasks.length === 0) continue;
					sections.push(`${colLabels[col]} (${tasks.length})`);
					for (const t of tasks) {
						const prio = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '';
						sections.push(`  ${prio}${prio ? ' ' : ''}${t.title.slice(0, 60)}`);
					}
					sections.push('');
				}
				if (data.stats?.total === 0) sections.push('Board is empty.');
				ctx.ui.notify(sections.join('\n'), 'info');
			} catch (err: any) {
				ctx.ui.notify(`❌ ${err.message}`, 'error');
			}
		},
	});

	pi.registerTool({
		name: "mesh_new_project",
		label: "New Project",
		description: "Reset the P10 workspace to a clean state. Clears the WebContainer (back to starter template), removes project board tasks (keeps platform tasks), and clears pipeline history. Use when starting a new project.",
		parameters: Type.Object({}),
		async execute() {
			try {
				const data = await masterFetch("/project/new", { method: "POST" });
				const lines = [
					"🆕 New project created!",
					"",
					`Cleared: ${data.cleared?.tasks || 0} tasks, ${data.cleared?.pipelines || 0} pipelines, ${data.cleared?.memory || 0} memory nodes`,
					"",
					"WebContainer will reboot with the starter template (React + Express).",
					"Platform tasks (⚙️) are preserved.",
				];
				return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
			} catch (err: any) {
				return { content: [{ type: "text", text: `❌ Failed: ${err.message}` }], details: {} };
			}
		},
	});

	pi.registerCommand("new-project", {
		description: "Reset workspace to a new project (clears board, container, pipelines)",
		handler: async (_args, ctx) => {
			try {
				const data = await masterFetch("/project/new", { method: "POST" });
				ctx.ui.notify(`🆕 New project! Cleared ${data.cleared?.tasks || 0} tasks, ${data.cleared?.pipelines || 0} pipelines. Container rebooting.`, "info");
			} catch (err: any) {
				ctx.ui.notify(`❌ ${err.message}`, "error");
			}
		},
	});

	pi.registerCommand("mesh-activity", {
		description: "Configure mesh activity feed: /mesh-activity [off|minimal|normal|verbose]",
		handler: async (args, ctx) => {
			const level = args?.trim().toLowerCase();
			if (level && ['off', 'minimal', 'normal', 'verbose'].includes(level)) {
				activityVerbosity = level as ActivityVerbosity;
				saveConfig({ activityFeed: activityVerbosity });
				ctx.ui.notify(`📡 Activity feed: ${activityVerbosity} (saved)`, "info");
			} else {
				const levels = {
					off: 'No activity notifications',
					minimal: 'Agent events only (task start/done/fail/idle)',
					normal: 'Agent + pipeline + daemon join/leave',
					verbose: 'All events including board mutations',
				};
				const lines = Object.entries(levels).map(([k, v]) =>
					`  ${k === activityVerbosity ? '▶' : ' '} ${k}: ${v}`
				);
				ctx.ui.notify(`📡 Activity feed: ${activityVerbosity}\n${lines.join('\n')}\n\nUsage: /mesh-activity [off|minimal|normal|verbose]`, "info");
			}
		},
	});

	pi.registerCommand("mesh-quit", {
		description: "Test: Send quit notification to mesh (for testing session cleanup)",
		handler: async (_args, ctx) => {
			try {
				await masterFetch("/pi-quit", {
					method: "POST",
					body: JSON.stringify({ sessionId: PI_SESSION_ID })
				});
				ctx.ui.notify(`🗺 Session ${PI_SESSION_ID} quit notification sent`, "info");
			} catch (err: any) {
				ctx.ui.notify(`❌ Failed to send quit: ${err.message}`, "error");
			}
		},
	});
}
