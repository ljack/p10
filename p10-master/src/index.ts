import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { writeFileSync, unlinkSync, openSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { DaemonRegistry } from './registry.js';
import { MessageRouter } from './router.js';
import { MASTER_DISCOVERY_FILE, DEFAULT_PORT, makeId } from './types.js';
import { IntegrationManager } from './integrations.js';
import { MessageTracker } from './messageTracker.js';
import { MeshEventBus } from './eventBus.js';
import { PipelineExecutor } from './pipelineExecutor.js';
import { decompose } from './decomposer.js';
import { pipelineStorage } from './pipelineStorage.js';
import { taskBoard } from './taskBoard.js';
import { PlanSync } from './planSync.js';
import { TaskAnalyst } from './taskAnalyst.js';
import { boardMemory } from './boardMemory.js';
import { GroomingAgent } from './groomingAgent.js';
import { AutoScheduler } from './autoScheduler.js';
import type { DaemonMessage, RegisterPayload, HeartbeatPayload } from './types.js';
import type { TaskPipeline } from './decomposer.js';
import { runManager } from './autonomousRun.js';

const PORT = parseInt(process.env.P10_PORT || String(DEFAULT_PORT));

/** Format pipeline result for human-readable output */
function formatPipelineResult(pipeline: TaskPipeline): string {
	const lines = [`Pipeline: "${pipeline.instruction}"`];
	lines.push(`Status: ${pipeline.status}`);
	lines.push('');
	for (const task of pipeline.tasks) {
		const icon = task.status === 'completed' ? '✅' :
			task.status === 'failed' ? '❌' :
			task.status === 'skipped' ? '⏭' : '○';
		lines.push(`${icon} [${task.role}] ${task.instruction.slice(0, 80)}`);
		if (task.result) lines.push(`   → ${task.result.slice(0, 150)}`);
	}
	const completed = pipeline.tasks.filter(t => t.status === 'completed').length;
	lines.push('');
	lines.push(`${completed}/${pipeline.tasks.length} tasks completed`);
	return lines.join('\n');
}

const registry = new DaemonRegistry();
const router = new MessageRouter();
router.setRegistry(registry);
const integrations = new IntegrationManager();
const tracker = new MessageTracker();
const eventBus = new MeshEventBus(registry, router);
const pipelineExecutor = new PipelineExecutor(registry, router, eventBus);
runManager.setExecutor(pipelineExecutor);
runManager.setEventBus(eventBus);

// Channel activity tracking (for smart Telegram notifications)
const channelActivity = new Map<string, Date>();

function trackChannelActivity(channel: string) {
	channelActivity.set(channel, new Date());
}

function isChannelActive(channel: string, windowMs: number = 60 * 60 * 1000): boolean {
	const lastActive = channelActivity.get(channel);
	if (!lastActive) return false;
	return (Date.now() - lastActive.getTime()) < windowMs;
}

// Wire task board into event bus
taskBoard.setEventBus(eventBus);

// PLAN.md sync
const planSync = new PlanSync(taskBoard);
planSync.watch();

// Task analyst agent
const taskAnalyst = new TaskAnalyst(taskBoard, router, registry, eventBus, {
	analysisDelayMs: parseInt(process.env.P10_ANALYSIS_DELAY || '10000'),
});
taskAnalyst.setMemory(boardMemory);
taskAnalyst.start();

// Grooming agent (board → archive → memory → reflection)
const groomingAgent = new GroomingAgent(taskBoard, boardMemory, router, registry, eventBus, {
	intervalMs: parseInt(process.env.P10_GROOM_INTERVAL || String(5 * 60 * 1000)),
	archiveAfterMs: parseInt(process.env.P10_ARCHIVE_AFTER || String(30 * 60 * 1000)),
});
groomingAgent.start();

// Auto-scheduler: assign planned tasks to idle agents
const autoScheduler = new AutoScheduler(taskBoard, router, registry, eventBus, tracker);

// When board tasks move to done/failed, update PLAN.md checkboxes
eventBus.subscribe('master', 'board.task.moved', 'plan-sync');
// Hook into event bus to trigger PLAN.md updates + auto-scheduler + Telegram forwarding
const origEmit = eventBus.emit.bind(eventBus);
eventBus.emit = (type: string, source: string, data: any, scope?: any) => {
	origEmit(type, source, data, scope);

	// PLAN.md sync
	if (type === 'board.task.moved' && (data?.to === 'done' || data?.to === 'failed')) {
		planSync.updatePlanFile();
	}

	// Auto-scheduler: idle agent wants work
	if (type === 'agent.idle' && data?.agentId) {
		autoScheduler.handleAgentIdle(data.agentId);
	}

	// Smart Telegram notifications: forward agent events if human was recently active
	if (type.startsWith('agent.') && isChannelActive('telegram')) {
		const telegramDaemon = registry.getByType('custom').find(d => d.name.includes('Telegram'));
		if (telegramDaemon) {
			router.sendTo(telegramDaemon.id, {
				id: makeId(),
				from: 'master',
				to: telegramDaemon.id,
				type: 'activity_notification',
				payload: { type, source, data },
				timestamp: new Date().toISOString(),
			});
		}
	}
};

// Pi CLI session tracking
const piCliSessions = new Map<string, { id: string; userAgent: string; lastSeen: Date; created: Date; }>();
function trackPiSession(req: any): string {
	// Use the custom session ID from pi extension, or create a more unique fallback
	const sessionId = req.headers['x-pi-session-id'] || 
					 `pi-fallback-${req.socket?.remotePort || Math.random().toString(36).slice(2)}-${Date.now()}`;
	
	console.log(`[master] Tracking pi session: ${sessionId} (UA: ${req.headers['user-agent']})`);
	
	const isNewSession = !piCliSessions.has(sessionId);
	piCliSessions.set(sessionId, {
		id: sessionId,
		userAgent: req.headers['user-agent'] || 'unknown',
		lastSeen: new Date(),
		created: piCliSessions.get(sessionId)?.created || new Date()
	});
	
	if (isNewSession) {
		console.log(`[master] 🆕 New pi session: ${sessionId}`);
		
		// Emit mesh event for new pi session
		eventBus.emit('mesh.pi.joined', sessionId, { userAgent: req.headers['user-agent'] || 'unknown' }, 'pi');
	}
	return sessionId;
}
function cleanupStalePiSessions() {
	const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
	for (const [id, session] of piCliSessions) {
		if (session.lastSeen < fiveMinutesAgo) {
			piCliSessions.delete(id);
		}
	}
}
setInterval(cleanupStalePiSessions, 60000); // Cleanup every minute

// HTTP server for health/status
const httpServer = createServer((req, res) => {
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Access-Control-Allow-Origin', '*');

	if (req.url === '/health') {
		res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
		return;
	}

	if (req.url === '/status') {
		// Track this pi session - be more permissive to catch all pi CLI requests
		if (req.headers['x-pi-session-id'] || req.headers['user-agent']?.includes('pi-cli')) {
			trackPiSession(req);
		}
		
		const daemons = registry.getAll();
		const piDaemon = daemons.find(d => d.type === 'pi');
		const activePiSessions = piCliSessions.size;
		
		res.end(JSON.stringify({
			master: { status: 'running', port: PORT, uptime: process.uptime() },
			daemons,
			piSessions: {
				activeSessions: activePiSessions,
				daemonStatus: piDaemon ? piDaemon.status : 'not connected',
				lastSessionIds: Array.from(piCliSessions.keys()).slice(-3)
			},
			systemTldr: registry.getSystemTldr() + (activePiSessions > 0 ? ` | ${activePiSessions} pi CLI session(s)` : ''),
			timestamp: new Date().toISOString()
		}, null, 2));
		return;
	}

	if (req.url === '/tldr') {
		res.end(JSON.stringify({ tldr: registry.getSystemTldr() }));
		return;
	}

	// Pi CLI quit endpoint
	if (req.method === 'POST' && req.url === '/pi-quit') {
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const { sessionId } = JSON.parse(body);
				if (sessionId && piCliSessions.has(sessionId)) {
					const session = piCliSessions.get(sessionId);
					piCliSessions.delete(sessionId);
					const duration = session ? Math.round((Date.now() - session.created.getTime()) / 1000) : 0;
					console.log(`[master] 📴 Pi session quit: ${sessionId} (${duration}s session)`);
					
					// Emit mesh event for pi session quit
					eventBus.emit('mesh.pi.quit', sessionId, { duration }, 'pi');
					
					res.end(JSON.stringify({ success: true, message: 'Session removed', duration }));
				} else {
					res.end(JSON.stringify({ success: false, message: 'Session not found' }));
				}
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	// REST API for fire-and-forget operations (no WebSocket needed)
	if (req.method === 'POST' && req.url === '/task') {
		trackPiSession(req);
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const payload = JSON.parse(body);
				const target = payload.target || '*';
				const taskId = payload.taskId || makeId();
				const message: DaemonMessage = {
					id: makeId(),
					from: payload.from || 'rest-api',
					to: target,
					type: 'task',
					payload: { taskId, instruction: payload.instruction, context: payload.context, priority: payload.priority || 'normal' },
					timestamp: new Date().toISOString()
				};
				// Track message origin for bidirectional routing
				const channel = payload.channel || 'rest-api';
				trackChannelActivity(channel);
				tracker.track(taskId, {
					channel,
					channelId: payload.channelId || payload.from || 'rest',
					userId: payload.userId,
					userName: payload.userName
				}, payload.instruction);

				// Add to board
				taskBoard.add({
					id: taskId,
					title: payload.instruction?.slice(0, 120) || 'Untitled task',
					instruction: payload.instruction,
					column: 'planned',
					origin: { channel: payload.channel || 'rest-api', userId: payload.userId, userName: payload.userName },
					priority: payload.priority || 'normal',
				});

				const result = router.route(message);

				// Move to in-progress if routed, blocked if not
				if (result.routed) {
					taskBoard.move(taskId, 'in-progress');
				} else if (result.blocked) {
					taskBoard.move(taskId, 'blocked', { result: result.blocked });
				}

				console.log(`[master] REST task: "${payload.instruction?.slice(0, 60)}" → ${target} (${result.routed ? 'routed' : 'blocked: ' + result.blocked})`);
				res.end(JSON.stringify({ taskId, routed: result.routed, blocked: result.blocked }));
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.method === 'POST' && req.url === '/query') {
		trackPiSession(req);
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const payload = JSON.parse(body);
				if (payload.channel) trackChannelActivity(payload.channel);
				const target = payload.target || '*';
				const queryId = makeId();

				// For REST queries, we need to wait for the response
				// Set up a temporary listener on the router
				const timeout = setTimeout(() => {
					res.end(JSON.stringify({ queryId, answer: null, error: 'timeout' }));
				}, 15000);

				// Create a temporary WS-like receiver
				const tempId = 'rest-' + makeId();
				const tempWs = {
					readyState: 1, // OPEN
					OPEN: 1,
					send(data: string) {
						try {
							const msg = JSON.parse(data);
							if (msg.type === 'query_response' && msg.payload?.queryId === queryId) {
								clearTimeout(timeout);
								router.removeConnection(tempId);
								res.end(JSON.stringify({ queryId, answer: msg.payload.answer }));
							}
						} catch { /* ignore */ }
					}
				} as any;

				router.addConnection(tempId, tempWs);

				const message: DaemonMessage = {
					id: makeId(),
					from: tempId,
					to: target,
					type: 'query',
					payload: { queryId, question: payload.question, context: payload.context },
					timestamp: new Date().toISOString()
				};
				router.route(message);
				console.log(`[master] REST query: "${payload.question?.slice(0, 60)}" → ${target}`);
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.method === 'POST' && req.url === '/message') {
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const message = JSON.parse(body) as DaemonMessage;
				message.id = message.id || makeId();
				message.timestamp = message.timestamp || new Date().toISOString();
				const result = router.route(message);
				res.end(JSON.stringify({ routed: result.routed, blocked: result.blocked }));
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	// Integration management endpoints
	if (req.method === 'POST' && req.url === '/integrations/telegram/setup') {
		const result = integrations.startTelegramSetup();
		res.end(JSON.stringify(result));
		return;
	}

	if (req.method === 'POST' && req.url === '/integrations/telegram/token') {
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', async () => {
			try {
				const { token } = JSON.parse(body);
				const result = await integrations.setTelegramToken(token);
				res.end(JSON.stringify(result));
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.method === 'POST' && req.url === '/integrations/telegram/register') {
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const { userId, name } = JSON.parse(body);
				const result = integrations.registerTelegramUser(userId, name);
				res.end(JSON.stringify(result));
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.url === '/integrations') {
		res.end(JSON.stringify({
			telegram: {
				status: integrations.getConfig().telegram?.status || 'not_configured',
				botUsername: integrations.getConfig().telegram?.botUsername,
				allowedUsers: integrations.getConfig().telegram?.allowedUsers?.length || 0
			}
		}));
		return;
	}

	// Message history endpoint (for daemons to query)
	if (req.url === '/messages') {
		res.end(JSON.stringify({
			pending: tracker.getPending(),
			recent: tracker.getHistory(20),
			tldr: tracker.getTldr()
		}, null, 2));
		return;
	}

	// --- Pipeline endpoints ---

	if (req.method === 'POST' && req.url === '/pipeline') {
		if (req.headers['x-pi-session-id'] || req.headers['user-agent']?.includes('pi-cli')) {
			trackPiSession(req);
		}
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', async () => {
			try {
				const { instruction, channel, channelId, userId, userName } = JSON.parse(body);
				if (channel) trackChannelActivity(channel);
				if (!instruction) {
					res.statusCode = 400;
					res.end(JSON.stringify({ error: 'instruction required' }));
					return;
				}

				console.log(`[master] Pipeline request: "${instruction.slice(0, 80)}"`);

				// Decompose into pipeline
				const pipeline = await decompose(instruction);
				pipelineStorage.store(pipeline);

				// Track origin
				tracker.track(pipeline.id, {
					channel: channel || 'rest-api',
					channelId: channelId || 'rest',
					userId,
					userName,
				}, instruction);

				// Return immediately with pipeline info (execution is async)
				res.end(JSON.stringify({
					pipelineId: pipeline.id,
					approach: pipeline.approach,
					tasks: pipeline.tasks.map(t => ({
						id: t.id,
						role: t.role,
						instruction: t.instruction,
						status: t.status,
					})),
					status: 'planning',
				}));

				// Execute asynchronously
				pipelineExecutor.execute(pipeline).then((result) => {
					console.log(`[master] Pipeline ${pipeline.id} finished: ${result.status}`);
					if (channel === 'telegram') {
						// Route completion to Telegram
						const telegramDaemon = registry.getByType('custom').find(d => d.name.includes('Telegram'));
						if (telegramDaemon) {
							router.sendTo(telegramDaemon.id, {
								id: makeId(),
								from: 'master',
								to: telegramDaemon.id,
								type: 'task_result',
								payload: {
									taskId: pipeline.id,
									origin: { channel: 'telegram', channelId, userId, userName },
									result: {
										success: result.status === 'completed',
										result: formatPipelineResult(result),
									},
								},
								timestamp: new Date().toISOString(),
							});
						}
					}
				}).catch((err: any) => {
					console.error(`[master] Pipeline ${pipeline.id} error:`, err.message);
				});

			} catch (err: any) {
				res.statusCode = 500;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.url?.startsWith('/pipeline/') && req.method === 'GET') {
		const pipelineId = req.url.split('/pipeline/')[1];
		const pipeline = pipelineStorage.get(pipelineId);
		if (pipeline) {
			res.end(JSON.stringify(pipeline, null, 2));
		} else {
			res.statusCode = 404;
			res.end(JSON.stringify({ error: 'Pipeline not found' }));
		}
		return;
	}

	// POST /pipeline/:id/cancel — cancel a running pipeline
	if (req.method === 'POST' && req.url?.match(/^\/pipeline\/[^/]+\/cancel$/)) {
		const pipelineId = req.url.split('/')[2];
		const result = pipelineExecutor.cancel(pipelineId);
		res.statusCode = result.success ? 200 : 400;
		res.end(JSON.stringify(result));
		return;
	}

	// POST /pipeline/:id/rerun — re-run a failed pipeline from first non-completed task
	if (req.method === 'POST' && req.url?.match(/^\/pipeline\/[^/]+\/rerun$/)) {
		const pipelineId = req.url.split('/')[2];
		pipelineExecutor.rerun(pipelineId).then((result) => {
			res.statusCode = result.success ? 200 : 400;
			res.end(JSON.stringify({ success: result.success, message: result.message }));
		}).catch((err: any) => {
			res.statusCode = 500;
			res.end(JSON.stringify({ error: err.message }));
		});
		return;
	}

	if (req.url === '/pipelines' && req.method === 'GET') {
		res.end(JSON.stringify({
			active: pipelineStorage.getActive(),
			recent: pipelineStorage.getRecent(10),
		}, null, 2));
		return;
	}

	// --- Autonomous Run endpoints ---

	if (req.method === 'POST' && req.url === '/run') {
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const { instruction, planContent, planFile } = JSON.parse(body);
				if (!instruction) {
					res.statusCode = 400;
					res.end(JSON.stringify({ error: 'instruction required' }));
					return;
				}
				runManager.start({ instruction, planContent, planFile }).then((run) => {
					res.end(JSON.stringify({
						runId: run.id,
						status: run.status,
						taskCount: run.tasks.length,
						planSource: run.planSource,
						tasks: run.tasks.map(t => ({ title: t.title, phase: t.phase, status: t.status })),
					}));
				}).catch((err: any) => {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: err.message }));
				});
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.url?.startsWith('/run/') && req.method === 'GET') {
		const runId = req.url.split('/run/')[1];
		const run = runManager.get(runId);
		if (run) {
			res.end(JSON.stringify(run, null, 2));
		} else {
			res.statusCode = 404;
			res.end(JSON.stringify({ error: 'Run not found' }));
		}
		return;
	}

	if (req.url === '/runs' && req.method === 'GET') {
		res.end(JSON.stringify({
			active: runManager.getActive(),
			recent: runManager.getRecent(10),
		}, null, 2));
		return;
	}

	if (req.method === 'POST' && req.url?.match(/^\/run\/[^/]+\/pause$/)) {
		const runId = req.url.split('/')[2];
		const result = runManager.pause(runId);
		res.statusCode = result.success ? 200 : 400;
		res.end(JSON.stringify(result));
		return;
	}

	if (req.method === 'POST' && req.url?.match(/^\/run\/[^/]+\/resume$/)) {
		const runId = req.url.split('/')[2];
		runManager.resume(runId).then((result) => {
			res.statusCode = result.success ? 200 : 400;
			res.end(JSON.stringify(result));
		}).catch((err: any) => {
			res.statusCode = 500;
			res.end(JSON.stringify({ error: err.message }));
		});
		return;
	}

	if (req.method === 'POST' && req.url?.match(/^\/run\/[^/]+\/cancel$/)) {
		const runId = req.url.split('/')[2];
		const result = runManager.cancel(runId);
		res.statusCode = result.success ? 200 : 400;
		res.end(JSON.stringify(result));
		return;
	}

	// --- Board endpoints ---

	if (req.url === '/board' && req.method === 'GET') {
		res.end(JSON.stringify(taskBoard.getBoard(), null, 2));
		return;
	}

	if (req.url?.startsWith('/board/column/') && req.method === 'GET') {
		const column = req.url.split('/board/column/')[1] as any;
		res.end(JSON.stringify(taskBoard.getColumn(column), null, 2));
		return;
	}

	if (req.method === 'POST' && req.url === '/board/task') {
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const payload = JSON.parse(body);
				if (!payload.title) {
					res.statusCode = 400;
					res.end(JSON.stringify({ error: 'title required' }));
					return;
				}
				const task = taskBoard.add(payload);
				res.end(JSON.stringify(task, null, 2));
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.method === 'PATCH' && req.url?.startsWith('/board/task/')) {
		const taskId = req.url.split('/board/task/')[1];
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const payload = JSON.parse(body);
				let result;
				if (payload.column) {
					result = taskBoard.move(taskId, payload.column, payload);
				} else {
					result = taskBoard.update(taskId, payload);
				}
				if (result) {
					res.end(JSON.stringify(result, null, 2));
				} else {
					res.statusCode = 404;
					res.end(JSON.stringify({ error: 'Task not found' }));
				}
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.method === 'DELETE' && req.url?.startsWith('/board/task/')) {
		const taskId = req.url.split('/board/task/')[1];
		const removed = taskBoard.remove(taskId);
		res.end(JSON.stringify({ removed }));
		return;
	}

	if (req.url === '/board/sync' && req.method === 'GET') {
		res.end(JSON.stringify(planSync.getStatus(), null, 2));
		return;
	}

	if (req.method === 'POST' && req.url === '/board/sync') {
		planSync.sync();
		res.end(JSON.stringify({ synced: true, ...planSync.getStatus() }));
		return;
	}

	// --- Memory endpoints ---

	if (req.url === '/board/memory' && req.method === 'GET') {
		res.end(JSON.stringify({
			reflections: boardMemory.getReflections(),
			memories: boardMemory.getByTier('memory'),
			archives: boardMemory.getByTier('archive'),
			stats: boardMemory.getStats(),
		}, null, 2));
		return;
	}

	if (req.url === '/board/memory/reflections' && req.method === 'GET') {
		res.end(JSON.stringify(boardMemory.getReflections(), null, 2));
		return;
	}

	if (req.url?.startsWith('/board/memory/search') && req.method === 'GET') {
		try {
			const urlObj = new URL(req.url, 'http://localhost');
			const query = urlObj.searchParams.get('q') || '';
			const results = boardMemory.search(query);
			res.end(JSON.stringify(results, null, 2));
		} catch {
			res.end(JSON.stringify([]));
		}
		return;
	}

	if (req.url?.startsWith('/board/memory/') && req.method === 'GET') {
		const id = req.url.split('/board/memory/')[1];
		if (id && id !== 'search' && id !== 'reflections') {
			const result = boardMemory.getWithChildren(id);
			if (result) {
				res.end(JSON.stringify({ ...result, path: boardMemory.getPath(id) }, null, 2));
			} else {
				res.statusCode = 404;
				res.end(JSON.stringify({ error: 'Memory node not found' }));
			}
			return;
		}
	}

	if (req.method === 'POST' && req.url?.startsWith('/board/memory/rebirth/')) {
		const id = req.url.split('/board/memory/rebirth/')[1];
		const node = boardMemory.get(id);
		if (!node) {
			res.statusCode = 404;
			res.end(JSON.stringify({ error: 'Memory node not found' }));
			return;
		}
		// Rebirth: create a new planned task from the memory
		const task = taskBoard.add({
			title: node.title,
			instruction: node.summary,
			column: 'planned',
			origin: { channel: 'rebirth' },
			tags: [...node.tags, 'rebirth'],
		});
		res.end(JSON.stringify({ rebirthed: true, task }, null, 2));
		return;
	}

	if (req.url === '/board/memory/context' && req.method === 'GET') {
		try {
			const urlObj = new URL(req.url + '?' + (req.url.split('?')[1] || ''), 'http://localhost');
			const task = urlObj.searchParams.get('task') || '';
			res.end(JSON.stringify({ context: boardMemory.getContext(task) }));
		} catch {
			res.end(JSON.stringify({ context: '' }));
		}
		return;
	}

	if (req.url === '/board/grooming' && req.method === 'GET') {
		res.end(JSON.stringify(groomingAgent.getStatus(), null, 2));
		return;
	}

	if (req.method === 'POST' && req.url === '/board/groom') {
		groomingAgent.groom();
		res.end(JSON.stringify({ grooming: true }));
		return;
	}

	// Event bus endpoints
	if (req.url?.startsWith('/events')) {
		try {
			const urlObj = new URL(req.url, 'http://localhost');
			if (urlObj.pathname === '/events') {
				const limit = parseInt(urlObj.searchParams.get('limit') || '50');
				res.end(JSON.stringify({
					events: eventBus.getHistory(limit),
					stats: eventBus.getStats()
				}, null, 2));
				return;
			}
		} catch (err) {
			// Fallback for malformed URLs
			res.end(JSON.stringify({
				events: eventBus.getHistory(50),
				stats: eventBus.getStats()
			}, null, 2));
			return;
		}
	}

	if (req.method === 'POST' && req.url === '/events/emit') {
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const { type, source, data, scope } = JSON.parse(body);
				eventBus.emit(type, source || 'unknown', data, scope);
				res.end(JSON.stringify({ success: true }));
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.method === 'POST' && req.url === '/events/subscribe') {
		let body = '';
		req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
		req.on('end', () => {
			try {
				const { daemonId, pattern, handler } = JSON.parse(body);
				const subscriptionId = eventBus.subscribe(daemonId, pattern, handler);
				res.end(JSON.stringify({ subscriptionId }));
			} catch (err: any) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	if (req.url?.startsWith('/messages/channel/')) {
		const channel = req.url.split('/').pop()!;
		res.end(JSON.stringify(tracker.getByChannel(channel), null, 2));
		return;
	}

	// --- Restart endpoint ---
	if (req.method === 'POST' && req.url === '/restart') {
		console.log('[master] 🔄 Restart requested via API');
		res.end(JSON.stringify({ restarting: true, message: 'Master restarting — daemons will auto-reconnect in ~5s' }));

		const masterDir = fileURLToPath(new URL('..', import.meta.url));

		// Shut down first, then spawn replacement
		setTimeout(() => {
			console.log('[master] Shutting down for restart...');
			registry.stop();
			integrations.stopAll();
			try { unlinkSync(MASTER_DISCOVERY_FILE); } catch { /* ignore */ }

			// Close all WebSocket connections so daemons detect disconnect
			for (const client of wss.clients) {
				client.close();
			}
			wss.close();

			httpServer.close(() => {
				// Port is free now — spawn new process via shell (handles npx resolution)
				const logFd = openSync('/tmp/p10-master.log', 'a');
				const child = spawn('sh', ['-c', 'npx tsx src/index.ts'], {
					cwd: masterDir,
					detached: true,
					stdio: ['ignore', logFd, logFd],
					env: { ...process.env }
				});
				child.unref();
				console.log(`[master] New master spawned (PID ${child.pid}), exiting...`);
				process.exit(0);
			});

			// Safety: force exit after 5s if httpServer.close() hangs
			setTimeout(() => process.exit(0), 5000);
		}, 300);
		return;
	}

	// CORS preflight
	if (req.method === 'OPTIONS') {
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.statusCode = 204;
		res.end();
		return;
	}

	res.statusCode = 404;
	res.end(JSON.stringify({ error: 'Not found. Endpoints: GET /health, /status, /tldr. POST /task, /query, /message' }));
});

// WebSocket server
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws: WebSocket) => {
	let daemonId: string | null = null;

	ws.on('message', (data: Buffer) => {
		let message: DaemonMessage;
		try {
			message = JSON.parse(data.toString());
		} catch {
			ws.send(JSON.stringify({ type: 'error', payload: { error: 'Invalid JSON' } }));
			return;
		}

		switch (message.type) {
			case 'register': {
				const payload = message.payload as RegisterPayload;
				daemonId = message.from || makeId();
				const reg = registry.register(daemonId, payload);
				router.addConnection(daemonId, ws);

				// Send ack with assigned ID
				ws.send(JSON.stringify({
					id: makeId(),
					from: 'master',
					to: daemonId,
					type: 'register_ack',
					payload: { id: daemonId, registration: reg },
					timestamp: new Date().toISOString()
				}));

				// Notify others
				router.broadcast({
					id: makeId(),
					from: 'master',
					to: '*',
					type: 'register',
					payload: { daemon: reg },
					timestamp: new Date().toISOString()
				}, daemonId);

				console.log(`[master] ✅ ${payload.name} connected (${daemonId})`);
				
				// Emit mesh event for daemon registration
				eventBus.emit('mesh.daemon.joined', daemonId, { name: payload.name, type: payload.type, capabilities: payload.capabilities });
				
				break;
			}

			case 'heartbeat': {
				if (daemonId) {
					registry.heartbeat(daemonId, message.payload as HeartbeatPayload);
				}
				// Respond with pong + system TLDR
				ws.send(JSON.stringify({
					id: makeId(),
					from: 'master',
					to: daemonId || message.from,
					type: 'pong',
					payload: {
						systemTldr: registry.getSystemTldr(),
						daemons: registry.getAlive().map(d => ({ id: d.id, name: d.name, type: d.type, status: d.status }))
					},
					timestamp: new Date().toISOString()
				}));
				break;
			}

			case 'state_request': {
				// Request state from a specific daemon
				if (message.to && message.to !== 'master') {
					router.route(message);
				} else {
					// Return master state
					ws.send(JSON.stringify({
						id: makeId(),
						from: 'master',
						to: message.from,
						type: 'state_snapshot',
						payload: {
							daemons: registry.getAll(),
							systemTldr: registry.getSystemTldr()
						},
						timestamp: new Date().toISOString()
					}));
				}
				break;
			}

			case 'task_result': {
				// A daemon completed a task — notify pipeline executor + analyst + update tracker
				const taskId = message.payload?.taskId;
				if (taskId) {
					pipelineExecutor.handleTaskResult(taskId, message.payload?.result);
					taskAnalyst.handleTaskResult(taskId, message.payload?.result);
					groomingAgent.handleTaskResult(taskId, message.payload?.result);
				}
				if (taskId) {
					const tracked = tracker.get(taskId);
					if (message.payload?.result?.error) {
						tracker.fail(taskId, message.payload.result.error);
						taskBoard.move(taskId, 'failed', { result: message.payload.result.error });
					} else {
						tracker.complete(taskId, JSON.stringify(message.payload.result).slice(0, 500));
						taskBoard.move(taskId, 'done', { result: JSON.stringify(message.payload.result).slice(0, 500) });
					}

					// Route result back to origin channel
					if (tracked?.origin.channel === 'telegram') {
						// Send to Telegram daemon
						const telegramDaemon = registry.getByType('custom').find(d => d.name.includes('Telegram'));
						if (telegramDaemon) {
							router.sendTo(telegramDaemon.id, {
								id: makeId(),
								from: 'master',
								to: telegramDaemon.id,
								type: 'task_result',
								payload: {
									taskId,
									origin: tracked.origin,
									result: message.payload.result
								},
								timestamp: new Date().toISOString()
							});
						}
					}

					console.log(`[master] Task ${taskId} completed, origin: ${tracked?.origin.channel || 'unknown'}`);
				}

				// Also forward to the original requester if it was a specific daemon
				if (message.to && message.to !== 'master') {
					router.route(message);
				}
				break;
			}

			case 'emit_event': {
				// Daemon wants to emit a mesh event (e.g., agent.task.started)
				const evtType = message.payload?.type;
				const evtData = message.payload?.data;
				if (evtType) {
					eventBus.emit(evtType, message.from || 'unknown', evtData);
				}
				break;
			}

			default: {
				// Route to target daemon
				if (message.to && message.to !== 'master') {
					const result = router.route(message);
					if (!result.routed && result.blocked) {
						ws.send(JSON.stringify({
							id: makeId(),
							from: 'master',
							to: message.from,
							type: 'error',
							payload: { error: result.blocked, originalId: message.id },
							timestamp: new Date().toISOString()
						}));
					}
				}
				break;
			}
		}
	});

	ws.on('close', () => {
		if (daemonId) {
			const daemon = registry.get(daemonId);
			console.log(`[master] ❌ ${daemon?.name || daemonId} disconnected`);
			router.removeConnection(daemonId);
			registry.unregister(daemonId);

			// Notify others
			router.broadcast({
				id: makeId(),
				from: 'master',
				to: '*',
				type: 'unregister',
				payload: { id: daemonId },
				timestamp: new Date().toISOString()
			});
		}
	});

	ws.on('error', (err) => {
		console.error(`[master] WebSocket error:`, err.message);
	});
});

// Start
registry.start();
if (!process.env.P10_NO_INTEGRATIONS) {
	integrations.autoStart();
}

httpServer.listen(PORT, () => {
	console.log(`\n  ┌──────────────────────────────────────┐`);
	console.log(`  │  P10 Master Daemon                    │`);
	console.log(`  │  WebSocket: ws://localhost:${PORT}       │`);
	console.log(`  │  HTTP:      http://localhost:${PORT}      │`);
	console.log(`  │  Status:    http://localhost:${PORT}/status│`);
	console.log(`  └──────────────────────────────────────┘\n`);

	// Write discovery file
	writeFileSync(MASTER_DISCOVERY_FILE, JSON.stringify({
		wsUrl: `ws://localhost:${PORT}`,
		httpUrl: `http://localhost:${PORT}`,
		pid: process.pid,
		startedAt: new Date().toISOString()
	}, null, 2));
	console.log(`  Discovery file: ${MASTER_DISCOVERY_FILE}`);
});

// Cleanup on exit
function cleanup() {
	console.log('\n[master] Shutting down...');
	registry.stop();
	integrations.stopAll();
	planSync.unwatch();
	taskAnalyst.stop();
	groomingAgent.stop();
	autoScheduler.stop();
	try { unlinkSync(MASTER_DISCOVERY_FILE); } catch { /* ignore */ }
	wss.close();
	httpServer.close();
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
