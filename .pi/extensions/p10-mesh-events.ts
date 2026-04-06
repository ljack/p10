/**
 * P10 Mesh Events Extension for pi CLI
 * 
 * Provides autonomous event-driven reactions to mesh activities.
 * This enables pi CLI instances to react to:
 * - Other mesh participants' activities (state changes, task completions)
 * - Container/build events from browser daemons
 * - Task progress from other pi instances
 * - User interactions across the mesh
 * 
 * Use cases:
 * - Pi CLI waiting for user input gets notified of external solution
 * - Multiple pi instances coordinating on same project
 * - Real-time updates when containers are ready
 * - Autonomous workflow triggers based on mesh events
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync, existsSync } from "node:fs";

const DISCOVERY_FILE = "/tmp/p10-master.json";
const PI_SESSION_ID = `pi-cli-${process.pid}-${Date.now().toString(36)}`;

function getMasterUrl(): string | null {
	if (!existsSync(DISCOVERY_FILE)) return null;
	try {
		const data = JSON.parse(readFileSync(DISCOVERY_FILE, "utf-8"));
		return data.httpUrl || null;
	} catch {
		return null;
	}
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

// Event reaction registry
interface EventReaction {
	id: string;
	pattern: string;
	handler: (event: any, ctx: any) => Promise<void>;
	description: string;
}

const eventReactions = new Map<string, EventReaction>();

export default function (pi: ExtensionAPI) {
	let currentCtx: any = null;
	let eventPollingTimer: any = null;
	let lastEventCheck = new Date().toISOString();

	// Store context for event handlers
	pi.on("session_start", async (_event, ctx) => {
		currentCtx = ctx;
		
		// Start event polling for autonomous reactions
		startEventPolling();
		
		// Subscribe to key events
		await subscribeToMeshEvents();
		
		ctx.ui.notify("🌐 P10 Mesh Events active", "info");
	});

	pi.on("session_end", () => {
		stopEventPolling();
	});

	// --- Built-in Event Reactions ---

	// React to container state changes
	registerReaction("state.container.*", async (event, ctx) => {
		if (event.type === "state.container.ready") {
			ctx.ui.notify(`🚀 Container ready: ${event.data.url}`, "info");
			// Could auto-run tests, start development server, etc.
		} else if (event.type === "state.container.error") {
			ctx.ui.notify(`⚠️ Container error detected`, "warn");
		}
	}, "Container state monitoring");

	// React to task completions from other mesh participants
	registerReaction("task.completed", async (event, ctx) => {
		if (event.source !== PI_SESSION_ID) {
			ctx.ui.notify(`✅ Task completed by ${event.source}: ${event.data.instruction?.slice(0, 60)}...`, "info");
			// Could trigger follow-up actions, update context, etc.
		}
	}, "External task completion notifications");

	// React to new information that could resolve current blocking
	registerReaction("dev.solution.*", async (event, ctx) => {
		ctx.ui.notify(`💡 Solution discovered: ${event.data.description}`, "info");
		// This is where the magic happens - pi CLI can react to solutions
		// found by other mesh participants
	}, "Solution discovery reactions");

	// React to mesh topology changes
	registerReaction("mesh.*", async (event, ctx) => {
		if (event.type === "mesh.daemon.joined") {
			if (event.data.type === "browser") {
				ctx.ui.notify(`🌐 Browser daemon connected`, "info");
			}
		} else if (event.type === "mesh.pi.joined" && event.source !== PI_SESSION_ID) {
			ctx.ui.notify(`🤖 Another pi CLI connected (${event.source})`, "info");
		}
	}, "Mesh topology awareness");

	// --- Tools ---

	pi.registerTool({
		name: "mesh_events",
		label: "Mesh Events",
		description: "Get recent events from the P10 mesh event bus",
		parameters: Type.Object({
			limit: Type.Optional(Type.Number({ description: "Number of events to fetch. Default: 20" })),
			pattern: Type.Optional(Type.String({ description: "Filter events by type pattern (e.g., 'task.*', 'state.container.*')" }))
		}),
		async execute(_toolCallId, params) {
			try {
				const data = await masterFetch(`/events?limit=${params.limit || 20}`);
				let events = data.events || [];
				
				// Filter by pattern if provided
				if (params.pattern) {
					const regex = new RegExp(params.pattern.replace(/\*/g, '.*'));
					events = events.filter((e: any) => regex.test(e.type));
				}
				
				const lines = [
					`Recent mesh events (${events.length}):`,
					"",
					...events.map((e: any) => 
						`${e.timestamp.slice(11, 19)} | ${e.type} | ${e.source} | ${JSON.stringify(e.data).slice(0, 100)}`
					),
					"",
					`Stats: ${data.stats.totalEvents} total, ${data.stats.totalSubscriptions} subscriptions`
				];
				
				return {
					content: [{ type: "text", text: lines.join("\n") }],
					details: {},
				};
			} catch (err: any) {
				return {
					content: [{ type: "text", text: `Error: ${err.message}` }],
					details: {},
				};
			}
		},
	});

	pi.registerTool({
		name: "emit_mesh_event",
		label: "Emit Mesh Event",
		description: "Emit an event to the P10 mesh for other participants to react to",
		parameters: Type.Object({
			type: Type.String({ description: "Event type (e.g., 'dev.solution.found', 'user.input.needed')" }),
			data: Type.Object({}, { additionalProperties: true, description: "Event payload data" }),
			scope: Type.Optional(Type.String({ description: "Target scope: 'broadcast', 'pi', 'browser', 'telegram'" }))
		}),
		async execute(_toolCallId, params) {
			try {
				await masterFetch("/events/emit", {
					method: "POST",
					body: JSON.stringify({
						type: params.type,
						source: PI_SESSION_ID,
						data: params.data,
						scope: params.scope
					})
				});
				
				return {
					content: [{ type: "text", text: `✅ Event emitted: ${params.type}` }],
					details: {},
				};
			} catch (err: any) {
				return {
					content: [{ type: "text", text: `Error: ${err.message}` }],
					details: {},
				};
			}
		},
	});

	// --- Commands ---

	pi.registerCommand("mesh-listen", {
		description: "Toggle mesh event listening (for debugging)",
		handler: async (_args, ctx) => {
			if (eventPollingTimer) {
				stopEventPolling();
				ctx.ui.notify("🔇 Mesh event listening stopped", "info");
			} else {
				startEventPolling();
				ctx.ui.notify("🔊 Mesh event listening started", "info");
			}
		},
	});

	pi.registerCommand("mesh-reactions", {
		description: "List active mesh event reactions",
		handler: async (_args, ctx) => {
			const lines = [
				`Active mesh event reactions (${eventReactions.size}):`,
				"",
				...Array.from(eventReactions.values()).map(r => `• ${r.pattern} - ${r.description}`)
			];
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	// --- Helper Functions ---

	function registerReaction(pattern: string, handler: (event: any, ctx: any) => Promise<void>, description: string) {
		const id = `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		eventReactions.set(id, { id, pattern, handler, description });
		return id;
	}

	function startEventPolling() {
		if (eventPollingTimer) return;
		
		eventPollingTimer = setInterval(async () => {
			try {
				await checkForNewEvents();
			} catch {
				// Ignore polling errors
			}
		}, 2000); // Poll every 2 seconds
	}

	function stopEventPolling() {
		if (eventPollingTimer) {
			clearInterval(eventPollingTimer);
			eventPollingTimer = null;
		}
	}

	async function checkForNewEvents() {
		if (!currentCtx) return;

		try {
			// Get events since last check
			const data = await masterFetch(`/events?limit=50`);
			const events = data.events || [];
			
			// Filter to only new events
			const lastCheckTime = new Date(lastEventCheck).getTime();
			const newEvents = events.filter((e: any) => 
				new Date(e.timestamp).getTime() > lastCheckTime
			);

			if (newEvents.length > 0) {
				lastEventCheck = new Date().toISOString();
				
				// Process each new event
				for (const event of newEvents) {
					await processEvent(event);
				}
			}
		} catch {
			// Ignore fetch errors during polling
		}
	}

	async function processEvent(event: any) {
		if (!currentCtx) return;

		// Check each reaction pattern
		for (const reaction of eventReactions.values()) {
			if (matchesPattern(event.type, reaction.pattern)) {
				try {
					await reaction.handler(event, currentCtx);
				} catch (err) {
					console.error(`[mesh-events] Reaction error for ${reaction.pattern}:`, err);
				}
			}
		}
	}

	function matchesPattern(eventType: string, pattern: string): boolean {
		const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
		return new RegExp(`^${regexPattern}$`).test(eventType);
	}

	async function subscribeToMeshEvents() {
		// This would register with the master for real-time event notifications
		// For now, we use polling, but this could be enhanced with WebSocket subscriptions
		try {
			await masterFetch("/events/subscribe", {
				method: "POST",
				body: JSON.stringify({
					daemonId: PI_SESSION_ID,
					pattern: "*", // Subscribe to all events
					handler: "autonomous_reaction"
				})
			});
		} catch {
			// Ignore subscription errors - polling fallback works
		}
	}
}