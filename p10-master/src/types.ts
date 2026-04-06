/** P10 Daemon Mesh Protocol Types */

export type DaemonType = 'browser' | 'pi' | 'master' | 'test' | 'deploy' | 'custom';
export type DaemonStatus = 'alive' | 'stale' | 'dead';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DaemonMessage {
	id: string;
	from: string;
	to: string; // daemon ID, 'master', or '*' for broadcast
	type: DaemonMessageType;
	payload: any;
	timestamp: string;
}

export type DaemonMessageType =
	// Lifecycle
	| 'heartbeat'
	| 'register'
	| 'register_ack'
	| 'unregister'
	// Commands
	| 'task'
	| 'task_result'
	| 'task_with_role'
	| 'query'
	| 'query_response'
	// Pipelines
	| 'pipeline_progress'
	| 'pipeline_status'
	// State
	| 'state_snapshot'
	| 'state_request'
	// LLM
	| 'llm_request'
	| 'llm_response'
	// Security
	| 'approval_request'
	| 'approval_response'
	// System
	| 'error'
	| 'ping'
	| 'pong';

export interface DaemonRegistration {
	id: string;
	name: string;
	type: DaemonType;
	capabilities: string[];
	lastHeartbeat: string;
	status: DaemonStatus;
	tldr: string;
	metrics?: Record<string, number>;
}

export interface HeartbeatPayload {
	status: string;
	tldr: string;
	metrics?: Record<string, number>;
}

export interface RegisterPayload {
	name: string;
	type: DaemonType;
	capabilities: string[];
	secret?: string;
}

export interface TaskPayload {
	taskId: string;
	instruction: string;
	context?: string;
	priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface QueryPayload {
	queryId: string;
	question: string;
	context?: string;
}

export interface SecurityCheck {
	operation: string;
	command?: string;
	risk: RiskLevel;
	requiresApproval: boolean;
	reason: string;
}

export interface TaskWithRolePayload extends TaskPayload {
	role: string; // Agent role for this task
	context?: string; // Additional context for the role
}

export interface PipelineProgressPayload {
	pipelineId: string;
	currentTaskIndex: number;
	totalTasks: number;
	status: string;
	tasks: Array<{
		id: string;
		role: string;
		instruction: string;
		status: string;
	}>;
}

// Well-known discovery file
export const MASTER_DISCOVERY_FILE = '/tmp/p10-master.json';
export const DEFAULT_PORT = 7777;

export function makeId(): string {
	return Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}
