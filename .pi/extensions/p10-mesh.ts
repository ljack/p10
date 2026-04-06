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
import { readFileSync, existsSync } from "node:fs";

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

export default function (pi: ExtensionAPI) {
	// Notify on load
	pi.on("session_start", async (_event, ctx) => {
		const url = getMasterUrl();
		if (url) {
			try {
				const health = await masterFetch("/health");
				if (health.status === "ok") {
					ctx.ui.notify("🔗 P10 Mesh connected", "info");
					
					// Register quit handlers for immediate session cleanup
					const notifyQuit = async () => {
						try {
							await masterFetch("/pi-quit", {
								method: "POST",
								body: JSON.stringify({ sessionId: PI_SESSION_ID })
							});
							console.log('[p10-mesh] Session cleanup sent to master');
						} catch { /* ignore errors during quit */ }
					};
					
					// Handle different quit scenarios
					process.on('SIGINT', notifyQuit);
					process.on('SIGTERM', notifyQuit);
					process.on('beforeExit', notifyQuit);
					
					// Also hook into pi's own exit mechanisms if available
					if (typeof process.once === 'function') {
						process.once('exit', () => {
							// Synchronous cleanup as backup
							try {
								// Use synchronous fetch if possible
								require('child_process').execSync(`curl -s -X POST -H 'Content-Type: application/json' -d '{"sessionId":"${PI_SESSION_ID}"}' ${url}/pi-quit`, {timeout: 1000});
							} catch { /* ignore */ }
						});
					}
				}
			} catch {
				ctx.ui.notify("○ P10 Mesh offline", "info");
			}
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
