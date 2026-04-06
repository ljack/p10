/**
 * P10 Mesh Extension for pi
 * 
 * Connects this pi session to the P10 daemon mesh via the Master Daemon's REST API.
 * Provides custom tools for querying daemons, sending tasks, and checking mesh status.
 * 
 * The extension auto-discovers the Master Daemon from /tmp/p10-master.json.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync, existsSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

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
const PI_SESSION_ID = `pi-cli-${process.pid}-${Date.now().toString(36)}`;

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

export default function (pi: ExtensionAPI) {
	// Notify on load — auto-start mesh if not running
	pi.on("session_start", async (_event, ctx) => {
		// Auto-start mesh servers if they're not running
		const meshReady = await autoStartMesh(ctx);

		if (meshReady) {
			try {
				const health = await masterFetch("/health");
				if (health.status === "ok") {
					ctx.ui.notify("🔗 P10 Mesh connected", "info");
					
					// Notify master when pi session exits
					const notifyQuit = async () => {
						try {
							await masterFetch("/pi-quit", {
								method: "POST",
								body: JSON.stringify({ sessionId: PI_SESSION_ID })
							});
						} catch { /* ignore errors during quit */ }
					};
					process.on('SIGINT', notifyQuit);
					process.on('SIGTERM', notifyQuit);
					process.on('beforeExit', notifyQuit);
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
				details: {},
			};
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
