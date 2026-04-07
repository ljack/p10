/**
 * Message Tracker — tracks message origins for bidirectional routing.
 * 
 * When a message arrives from Telegram (or any channel), the tracker
 * remembers the origin so responses can be routed back.
 * 
 * Also stores message history for other daemons to query.
 */

export interface TrackedMessage {
	taskId: string;
	origin: {
		channel: string;      // 'telegram', 'browser-chat', 'rest-api', 'pi-cli'
		channelId: string;    // Telegram chat ID, daemon ID, etc.
		userId?: string;      // User identifier within the channel
		userName?: string;    // Human-readable name
	};
	instruction: string;
	status: 'pending' | 'in-progress' | 'completed' | 'failed';
	assignedTo?: string;      // Daemon ID that's handling it
	result?: string;
	createdAt: string;
	completedAt?: string;
}

const MAX_HISTORY = 200;

export class MessageTracker {
	private messages = new Map<string, TrackedMessage>();
	private history: TrackedMessage[] = [];

	/** Track a new message/task */
	track(taskId: string, origin: TrackedMessage['origin'], instruction: string): TrackedMessage {
		const msg: TrackedMessage = {
			taskId,
			origin,
			instruction,
			status: 'pending',
			createdAt: new Date().toISOString()
		};
		this.messages.set(taskId, msg);
		this.history = [...this.history.slice(-(MAX_HISTORY - 1)), msg];
		return msg;
	}

	/** Mark a task as assigned to a daemon */
	assign(taskId: string, daemonId: string) {
		const msg = this.messages.get(taskId);
		if (msg) {
			msg.status = 'in-progress';
			msg.assignedTo = daemonId;
		}
	}

	/** Mark a task as completed with result */
	complete(taskId: string, result: string) {
		const msg = this.messages.get(taskId);
		if (msg) {
			msg.status = 'completed';
			msg.result = result;
			msg.completedAt = new Date().toISOString();
		}
	}

	/** Mark a task as failed */
	fail(taskId: string, error: string) {
		const msg = this.messages.get(taskId);
		if (msg) {
			msg.status = 'failed';
			msg.result = error;
			msg.completedAt = new Date().toISOString();
		}
	}

	/** Get a tracked message by task ID */
	get(taskId: string): TrackedMessage | undefined {
		return this.messages.get(taskId);
	}

	/** Get all messages from a specific channel */
	getByChannel(channel: string, limit = 50): TrackedMessage[] {
		return this.history
			.filter(m => m.origin.channel === channel)
			.slice(-limit);
	}

	/** Clear all tracked messages */
	clearAll() {
		this.messages.clear();
		this.history = [];
	}

	/** Get recent history */
	getHistory(limit = 50): TrackedMessage[] {
		return this.history.slice(-limit);
	}

	/** Get pending tasks (for status display) */
	getPending(): TrackedMessage[] {
		return Array.from(this.messages.values()).filter(m => m.status === 'pending' || m.status === 'in-progress');
	}

	/** Generate TLDR of message flow */
	getTldr(): string {
		const pending = this.getPending();
		const recent = this.history.slice(-5);
		const parts: string[] = [];

		if (pending.length > 0) {
			parts.push(`${pending.length} pending task(s)`);
		}

		const channels = new Set(this.history.map(m => m.origin.channel));
		if (channels.size > 0) {
			parts.push(`channels: ${Array.from(channels).join(', ')}`);
		}

		parts.push(`${this.history.length} total messages`);

		return parts.join(', ');
	}
}
