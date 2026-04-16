/**
 * Spec Manager — tracks project specifications through the development lifecycle.
 * Specs are markdown documents that drive the 24h loop:
 * 
 * Discovery → Planning → Development → Testing
 * IDEA.md → PRD.md → FSD.md → PLAN.md → code → tests
 */

export type SpecPhase = 'discovery' | 'planning' | 'development' | 'testing';

export interface SpecDocument {
	name: string;
	filename: string;
	content: string;
	phase: SpecPhase;
	status: 'empty' | 'draft' | 'review' | 'approved';
	updatedAt: Date;
}

export interface PlanTask {
	id: string;
	title: string;
	description: string;
	status: 'todo' | 'in-progress' | 'done' | 'blocked';
	agent?: string;
	dependencies: string[];
}

const SPEC_TEMPLATES: Record<string, { phase: SpecPhase; template: string }> = {
	'IDEA.md': {
		phase: 'discovery',
		template: `# Project Idea

## What are we building?
<!-- Describe the application in plain language -->

## Who is it for?
<!-- Target users / audience -->

## Key Features (MVP)
<!-- List the must-have features -->
- 

## Nice-to-Have (Post-MVP)
<!-- Features that can wait -->
- 

## Inspiration / References
<!-- Similar products, screenshots, links -->
`
	},
	'PRD.md': {
		phase: 'planning',
		template: `# Product Requirements Document

## Overview
<!-- Brief product description -->

## Goals & Success Metrics
<!-- What does success look like? -->

## User Stories
<!-- As a [user], I want to [action], so that [benefit] -->
- 

## Functional Requirements
### Core Features
- 

### User Interface
- 

### Data Model
- 

## Non-Functional Requirements
- Performance: 
- Security: 
- Accessibility: 

## Out of Scope
- 
`
	},
	'FSD.md': {
		phase: 'planning',
		template: `# Functional Specification Document

## System Architecture
<!-- High-level architecture diagram / description -->

## API Design
### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| | | |

### Data Models
\`\`\`typescript
// Define your types here
\`\`\`

## Frontend Design
### Pages / Routes
- 

### Components
- 

### State Management
- 

## Backend Design
### Database Schema
- 

### Business Logic
- 

### Authentication / Authorization
- 

## Third-Party Dependencies
- 
`
	},
	'PLAN.md': {
		phase: 'planning',
		template: `# Implementation Plan

## Phase 1: Foundation
- [ ] Task 1
- [ ] Task 2

## Phase 2: Core Features
- [ ] Task 3
- [ ] Task 4

## Phase 3: Polish & Testing
- [ ] Task 5
- [ ] Task 6

## Technical Decisions
- Framework: 
- Database: 
- Styling: 

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| | |
`
	}
};

class SpecManager {
	specs = $state<SpecDocument[]>([
		{ name: 'Idea', filename: 'IDEA.md', content: '', phase: 'discovery', status: 'empty', updatedAt: new Date() },
		{ name: 'PRD', filename: 'PRD.md', content: '', phase: 'planning', status: 'empty', updatedAt: new Date() },
		{ name: 'FSD', filename: 'FSD.md', content: '', phase: 'planning', status: 'empty', updatedAt: new Date() },
		{ name: 'Plan', filename: 'PLAN.md', content: '', phase: 'planning', status: 'empty', updatedAt: new Date() }
	]);

	tasks = $state<PlanTask[]>([]);

	get currentPhase(): SpecPhase {
		const approved = this.specs.filter((s) => s.status === 'approved');
		if (approved.some((s) => s.filename === 'PLAN.md')) return 'development';
		if (approved.some((s) => s.filename === 'PRD.md')) return 'planning';
		if (approved.some((s) => s.filename === 'IDEA.md')) return 'planning';
		return 'discovery';
	}

	updateSpec(filename: string, content: string, status?: SpecDocument['status']) {
		this.specs = this.specs.map((s) =>
			s.filename === filename
				? { ...s, content, status: status ?? (content.trim() ? 'draft' : 'empty'), updatedAt: new Date() }
				: s
		);
	}

	/** Update spec and optionally sync to container file system */
	updateSpecWithSync(filename: string, content: string, status?: SpecDocument['status']) {
		this.updateSpec(filename, content, status);
		// Import dynamically to avoid circular dependencies
		import('./specLoader.ts').then(({ saveSpecToContainer }) => {
			saveSpecToContainer(filename, content).catch(err => 
				console.warn(`Failed to save ${filename} to container:`, err)
			);
		});
	}

	approveSpec(filename: string) {
		this.specs = this.specs.map((s) =>
			s.filename === filename ? { ...s, status: 'approved', updatedAt: new Date() } : s
		);
	}

	getSpec(filename: string): SpecDocument | undefined {
		return this.specs.find((s) => s.filename === filename);
	}

	getTemplate(filename: string): string {
		return SPEC_TEMPLATES[filename]?.template ?? '';
	}

	/** Parse tasks from PLAN.md content */
	parseTasks(planContent: string): PlanTask[] {
		const tasks: PlanTask[] = [];
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
					status: done ? 'done' : 'todo',
					dependencies: []
				});
			}
		}

		this.tasks = tasks;
		return tasks;
	}

	updateTaskStatus(taskId: string, status: PlanTask['status']) {
		this.tasks = this.tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
	}

	/** Get spec context for the AI agent — includes all non-empty specs */
	getSpecContext(): string {
		const filled = this.specs.filter((s) => s.content);
		if (filled.length === 0) return '';

		return filled
			.map((s) => `--- ${s.filename} (${s.status}) ---\n${s.content}`)
			.join('\n\n');
	}
}

export const specManager = new SpecManager();
