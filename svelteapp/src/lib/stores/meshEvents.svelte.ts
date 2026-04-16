/**
 * Mesh Events Store — tracks mesh traffic to/from browser daemon
 * For debugging and monitoring mesh communication
 */

interface MeshEvent {
	id: string;
	timestamp: Date;
	direction: 'incoming' | 'outgoing';
	type: string;
	source?: string;
	target?: string;
	data: any;
	raw?: any;
}

const MAX_EVENTS = 200;

class MeshEventsStore {
	events = $state<MeshEvent[]>([]);
	isRecording = $state(true);

	/** Add an incoming event from the mesh */
	addIncoming(type: string, data: any, source?: string) {
		if (!this.isRecording) return;
		
		this.events.unshift({
			id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
			timestamp: new Date(),
			direction: 'incoming',
			type,
			source,
			target: 'browser',
			data,
			raw: data
		});
		
		this.prune();
	}

	/** Add an outgoing event to the mesh */
	addOutgoing(type: string, data: any, target?: string) {
		if (!this.isRecording) return;
		
		this.events.unshift({
			id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
			timestamp: new Date(),
			direction: 'outgoing',
			type,
			source: 'browser',
			target,
			data,
			raw: data
		});
		
		this.prune();
	}

	/** Clear all events */
	clear() {
		this.events = [];
	}

	/** Toggle recording */
	toggleRecording() {
		this.isRecording = !this.isRecording;
	}

	/** Get events filtered by direction */
	getByDirection(direction: 'incoming' | 'outgoing') {
		return this.events.filter(e => e.direction === direction);
	}

	/** Get events by type pattern */
	getByType(pattern: string) {
		const regex = new RegExp(pattern, 'i');
		return this.events.filter(e => regex.test(e.type));
	}

	private prune() {
		if (this.events.length > MAX_EVENTS) {
			this.events = this.events.slice(0, MAX_EVENTS);
		}
	}

	/** Format event for display */
	formatEvent(event: MeshEvent): string {
		const time = event.timestamp.toLocaleTimeString();
		const arrow = event.direction === 'incoming' ? '←' : '→';
		const route = event.direction === 'incoming' 
			? `${event.source || '?'} → browser`
			: `browser → ${event.target || '?'}`;
		return `${time} ${arrow} [${event.type}] ${route}`;
	}
}

export const meshEventsStore = new MeshEventsStore();