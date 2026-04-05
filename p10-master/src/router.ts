import type { WebSocket } from 'ws';
import type { DaemonMessage } from './types.js';
import { checkSecurity } from './security.js';

export class MessageRouter {
	private connections = new Map<string, WebSocket>();

	addConnection(id: string, ws: WebSocket) {
		this.connections.set(id, ws);
	}

	removeConnection(id: string) {
		this.connections.delete(id);
	}

	/** Route a message to its destination */
	route(message: DaemonMessage): { routed: boolean; blocked?: string } {
		// Security check for task/command messages
		if (message.type === 'task') {
			const check = checkSecurity(
				message.payload?.instruction || '',
				message.payload?.command || ''
			);
			if (check.requiresApproval) {
				console.log(`[router] 🚨 BLOCKED: ${check.reason} from ${message.from}`);
				// Send approval request back to sender
				this.sendTo(message.from, {
					id: message.id + '-approval',
					from: 'master',
					to: message.from,
					type: 'approval_request',
					payload: {
						originalMessage: message,
						security: check
					},
					timestamp: new Date().toISOString()
				});
				return { routed: false, blocked: check.reason };
			}
		}

		if (message.to === '*') {
			// Broadcast to all except sender
			for (const [id, ws] of this.connections) {
				if (id !== message.from) {
					this.send(ws, message);
				}
			}
			return { routed: true };
		}

		if (message.to === 'master') {
			// Handled by the server directly
			return { routed: true };
		}

		// Point-to-point
		const target = this.connections.get(message.to);
		if (target) {
			this.send(target, message);
			return { routed: true };
		}

		console.log(`[router] Target not found: ${message.to}`);
		return { routed: false, blocked: `Daemon ${message.to} not connected` };
	}

	sendTo(daemonId: string, message: DaemonMessage) {
		const ws = this.connections.get(daemonId);
		if (ws) this.send(ws, message);
	}

	broadcast(message: DaemonMessage, excludeId?: string) {
		for (const [id, ws] of this.connections) {
			if (id !== excludeId) {
				this.send(ws, message);
			}
		}
	}

	private send(ws: WebSocket, message: DaemonMessage) {
		if (ws.readyState === ws.OPEN) {
			ws.send(JSON.stringify(message));
		}
	}
}
