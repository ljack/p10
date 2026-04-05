/** Shared reactive agent state */

export type AgentStatusType = 'idle' | 'thinking' | 'writing' | 'executing' | 'error';

class AgentState {
	status = $state<AgentStatusType>('idle');
	task = $state('');

	setStatus(status: AgentStatusType, task = '') {
		this.status = status;
		this.task = task;
	}
}

export const agentState = new AgentState();
