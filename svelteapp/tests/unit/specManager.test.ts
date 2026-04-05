import { describe, it, expect } from 'vitest';

// Test the task parsing logic independently (since specManager uses $state which needs Svelte runtime)
function parseTasks(planContent: string) {
	const tasks: Array<{ id: string; title: string; description: string; status: string }> = [];
	const lines = planContent.split('\n');
	let currentPhase = '';

	for (const line of lines) {
		const phaseMatch = line.match(/^## (.+)/);
		if (phaseMatch) {
			currentPhase = phaseMatch[1];
			continue;
		}

		const taskMatch = line.match(/^- \[([ x])\] (.+)/);
		if (taskMatch) {
			const done = taskMatch[1] === 'x';
			tasks.push({
				id: Math.random().toString(36).slice(2, 8),
				title: taskMatch[2].trim(),
				description: `From: ${currentPhase}`,
				status: done ? 'done' : 'todo'
			});
		}
	}

	return tasks;
}

describe('specManager task parsing', () => {
	it('parses tasks from PLAN.md', () => {
		const plan = `# Implementation Plan

## Phase 1: Foundation
- [ ] Set up project structure
- [x] Initialize database
- [ ] Create auth module

## Phase 2: Features
- [ ] Build todo CRUD
- [ ] Add filtering
`;

		const tasks = parseTasks(plan);
		expect(tasks).toHaveLength(5);
		expect(tasks[0].title).toBe('Set up project structure');
		expect(tasks[0].status).toBe('todo');
		expect(tasks[1].title).toBe('Initialize database');
		expect(tasks[1].status).toBe('done');
		expect(tasks[1].description).toContain('Phase 1');
		expect(tasks[3].description).toContain('Phase 2');
	});

	it('returns empty array for no tasks', () => {
		expect(parseTasks('# Just a title\n\nSome text')).toHaveLength(0);
	});

	it('handles tasks without phases', () => {
		const plan = '- [ ] Task 1\n- [x] Task 2';
		const tasks = parseTasks(plan);
		expect(tasks).toHaveLength(2);
	});
});
