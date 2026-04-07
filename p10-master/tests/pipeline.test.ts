import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startMaster, type TestMaster } from './helper.ts';

describe('Pipeline Decomposition', () => {
	let master: TestMaster;

	before(async () => {
		master = await startMaster();
	});

	after(() => {
		master?.cleanup();
	});

	it('plan-driven decomposition parses PLAN.md', async () => {
		const { decomposeFromPlan } = await import('../src/decomposer.ts');

		const tasks = await decomposeFromPlan('Build all from plan', `
## Phase 1
- [x] Already done
- [ ] Build REST API endpoints
- [ ] Create login form component
- [ ] Write end-to-end tests
`);

		assert.strictEqual(tasks.length, 3);
		// Skips checked items
		assert.ok(!tasks.find(t => t.instruction.includes('Already done')));
	});

	it('role assignment: API keywords → api_agent', async () => {
		const { decomposeFromPlan } = await import('../src/decomposer.ts');
		const tasks = await decomposeFromPlan('all', '- [ ] Build REST API endpoints for user management\n');
		assert.strictEqual(tasks[0].role, 'api_agent');
	});

	it('role assignment: UI keywords → web_agent', async () => {
		const { decomposeFromPlan } = await import('../src/decomposer.ts');
		const tasks = await decomposeFromPlan('all', '- [ ] Create login form component with styling\n');
		assert.strictEqual(tasks[0].role, 'web_agent');
	});

	it('role assignment: test keywords → review_agent', async () => {
		const { decomposeFromPlan } = await import('../src/decomposer.ts');
		const tasks = await decomposeFromPlan('all', '- [ ] Write end-to-end test coverage\n');
		assert.strictEqual(tasks[0].role, 'review_agent');
	});

	it('role assignment: plan keywords → planning_agent', async () => {
		const { decomposeFromPlan } = await import('../src/decomposer.ts');
		const tasks = await decomposeFromPlan('all', '- [ ] Design system architecture and spec\n');
		assert.strictEqual(tasks[0].role, 'planning_agent');
	});

	it('dependency graph: api before web, review last', async () => {
		const { decomposeFromPlan } = await import('../src/decomposer.ts');
		const tasks = await decomposeFromPlan('all', `
- [ ] Write integration tests for auth flow
- [ ] Create login page component
- [ ] Build user API endpoints
- [ ] Design data model spec
`);

		const roles = tasks.map(t => t.role);
		const planIdx = roles.indexOf('planning_agent');
		const apiIdx = roles.indexOf('api_agent');
		const webIdx = roles.indexOf('web_agent');
		const reviewIdx = roles.indexOf('review_agent');

		// planning < api < web < review
		assert.ok(planIdx < apiIdx, 'planning before api');
		assert.ok(apiIdx < webIdx, 'api before web');
		assert.ok(webIdx < reviewIdx, 'web before review');

		// web depends on api
		const webTask = tasks[webIdx];
		assert.ok(webTask.dependsOn && webTask.dependsOn.length > 0, 'web should have dependencies');
	});

	it('complexity heuristic: simple vs complex', async () => {
		const { classifyComplexity } = await import('../src/decomposer.ts');

		assert.strictEqual(classifyComplexity('add dark mode'), 'simple');
		assert.strictEqual(classifyComplexity('fix the bug'), 'simple');
		assert.strictEqual(classifyComplexity('Build auth with login and registration'), 'complex');
		assert.strictEqual(classifyComplexity('Create REST API endpoints'), 'complex');
	});

	it('GET /pipelines returns empty initially', async () => {
		const data = await master.fetch('/pipelines');
		assert.strictEqual(data.active.length, 0);
		assert.strictEqual(data.recent.length, 0);
	});
});
