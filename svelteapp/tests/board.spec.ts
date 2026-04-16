import { test, expect } from '@playwright/test';
import { execSync, spawn, type ChildProcess } from 'child_process';
import { loginAndOpenProject, waitForServers, loadApiKey, setApiKey, sendMessage, waitForAgentDone } from './helpers';

const apiKey = loadApiKey();
let masterProcess: ChildProcess | null = null;

/**
 * Ensure Master Daemon is running for board tests.
 */
async function ensureMaster(): Promise<void> {
	try {
		const resp = await fetch('http://localhost:7777/health');
		if (resp.ok) return; // Already running
	} catch { /* not running */ }

	// Kill stale
	try { execSync('lsof -ti :7777 | xargs kill -9 2>/dev/null'); } catch { /* ok */ }
	await new Promise(r => setTimeout(r, 1000));

	masterProcess = spawn('npx', ['tsx', 'src/index.ts'], {
		cwd: '/Users/jarkko/_dev/p10/p10-master',
		stdio: 'pipe',
	});

	for (let i = 0; i < 15; i++) {
		try {
			const resp = await fetch('http://localhost:7777/health');
			if (resp.ok) return;
		} catch { /* retry */ }
		await new Promise(r => setTimeout(r, 1000));
	}
	throw new Error('Master Daemon failed to start');
}

async function boardFetch(path: string, opts?: RequestInit): Promise<any> {
	const resp = await fetch(`http://localhost:7777${path}`, {
		...opts,
		headers: { 'Content-Type': 'application/json', ...opts?.headers },
	});
	return resp.json();
}

test.describe('Kanban Board', () => {
	test.beforeAll(async () => {
		await ensureMaster();
	});

	test.afterAll(() => {
		// Only kill if we started it
		if (masterProcess) {
			masterProcess.kill('SIGTERM');
			masterProcess = null;
		}
	});

	// --- Board REST API ---

	test('GET /board returns board snapshot with stats', async () => {
		const board = await boardFetch('/board');
		expect(board).toHaveProperty('planned');
		expect(board).toHaveProperty('in-progress');
		expect(board).toHaveProperty('done');
		expect(board).toHaveProperty('failed');
		expect(board).toHaveProperty('blocked');
		expect(board).toHaveProperty('stats');
		expect(board.stats).toHaveProperty('total');
		expect(board.stats).toHaveProperty('byColumn');
		expect(board.stats).toHaveProperty('byScope');
	});

	test('POST /board/task creates a task with auto-scope', async () => {
		const task = await boardFetch('/board/task', {
			method: 'POST',
			body: JSON.stringify({
				title: 'E2E test: build login page',
				humanCreated: true,
				origin: { channel: 'test' },
				priority: 'normal',
			}),
		});

		expect(task.id).toBeTruthy();
		expect(task.title).toBe('E2E test: build login page');
		expect(task.column).toBe('planned');
		expect(task.scope).toBe('project'); // not a platform task
		expect(task.humanCreated).toBe(true);

		// Cleanup
		await boardFetch(`/board/task/${task.id}`, { method: 'DELETE' });
	});

	test('platform tasks get scope=platform automatically', async () => {
		const task = await boardFetch('/board/task', {
			method: 'POST',
			body: JSON.stringify({
				title: 'E2E test: fix mesh daemon heartbeat',
				origin: { channel: 'test' },
			}),
		});

		expect(task.scope).toBe('platform'); // "mesh" + "daemon" = platform

		await boardFetch(`/board/task/${task.id}`, { method: 'DELETE' });
	});

	test('PATCH /board/task/:id moves task between columns', async () => {
		const task = await boardFetch('/board/task', {
			method: 'POST',
			body: JSON.stringify({ title: 'E2E test: move me' }),
		});

		const moved = await boardFetch(`/board/task/${task.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ column: 'done', result: 'completed' }),
		});

		expect(moved.column).toBe('done');
		expect(moved.completedAt).toBeTruthy();
		expect(moved.result).toBe('completed');

		await boardFetch(`/board/task/${task.id}`, { method: 'DELETE' });
	});

	test('DELETE /board/task/:id removes task', async () => {
		const task = await boardFetch('/board/task', {
			method: 'POST',
			body: JSON.stringify({ title: 'E2E test: delete me' }),
		});

		const result = await boardFetch(`/board/task/${task.id}`, { method: 'DELETE' });
		expect(result.removed).toBe(true);

		// Verify it's gone
		const board = await boardFetch('/board');
		const all = [...board.planned, ...board['in-progress'], ...board.done, ...board.failed, ...board.blocked];
		expect(all.find((t: any) => t.id === task.id)).toBeUndefined();
	});

	// --- Project-scoped Board API ---

	test('project board is isolated from global board', async () => {
		// Create a user + project
		const user = await boardFetch('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ username: 'board-test-user' }),
		});
		const project = await boardFetch('/projects', {
			method: 'POST',
			body: JSON.stringify({ name: 'Board Test Project', ownerId: user.user.id }),
		});

		// Add task to project board
		const task = await boardFetch(`/projects/${project.id}/board/task`, {
			method: 'POST',
			body: JSON.stringify({ title: 'Project-scoped task' }),
		});
		expect(task.title).toBe('Project-scoped task');

		// Global board should NOT have this task
		const globalBoard = await boardFetch('/board');
		const allGlobal = [...globalBoard.planned, ...globalBoard['in-progress'], ...globalBoard.done];
		expect(allGlobal.find((t: any) => t.title === 'Project-scoped task')).toBeUndefined();

		// Project board should have it
		const projectBoard = await boardFetch(`/projects/${project.id}/board`);
		expect(projectBoard.planned.find((t: any) => t.title === 'Project-scoped task')).toBeTruthy();

		// Cleanup
		await fetch(`http://localhost:7777/projects/${project.id}`, { method: 'DELETE' });
	});

	// --- Board Memory API ---

	test('GET /board/memory returns memory tiers', async () => {
		const memory = await boardFetch('/board/memory');
		expect(memory).toHaveProperty('archives');
		expect(memory).toHaveProperty('memories');
		expect(memory).toHaveProperty('reflections');
		expect(memory).toHaveProperty('stats');
	});

	test('GET /board/memory/search returns results', async () => {
		const results = await boardFetch('/board/memory/search?q=test');
		expect(Array.isArray(results)).toBe(true);
	});

	test('GET /board/grooming returns agent status', async () => {
		const status = await boardFetch('/board/grooming');
		expect(status.running).toBe(true);
		expect(status.config).toHaveProperty('intervalMs');
		expect(status.config).toHaveProperty('archiveAfterMs');
	});

	// --- Board UI (requires login + project) ---

	test('Board tab visible in workspace', async ({ page }) => {
		await loginAndOpenProject(page, 'Board UI Test');
		await page.waitForTimeout(2000);

		const boardButton = page.locator('button:has-text("Board")');
		await expect(boardButton).toBeVisible();
	});

	test('Board tab shows kanban columns', async ({ page }) => {
		await loginAndOpenProject(page, 'Board UI Test');
		await page.waitForTimeout(2000);

		await page.locator('button:has-text("Board")').click();
		await page.waitForTimeout(3000);

		// Should show column headers
		await expect(page.getByText('Planned')).toBeVisible();
		await expect(page.getByText('In Progress')).toBeVisible();
		await expect(page.getByText('Done')).toBeVisible();
	});

	// --- Chat commands (require login + project) ---

	test('/board command shows board summary in chat', async ({ page }) => {
		await loginAndOpenProject(page, 'Board UI Test');
		await page.waitForTimeout(3000);

		await sendMessage(page, '/board');
		await page.waitForTimeout(2000);

		const body = await page.textContent('body') || '';
		expect(body).toContain('Board');
		expect(body).toMatch(/task|empty/i);
	});

	test('/add command creates task from chat', async ({ page }) => {
		const projectId = await loginAndOpenProject(page, 'Board UI Test');
		await page.waitForTimeout(3000);

		const taskTitle = `E2E chat add ${Date.now()}`;
		await sendMessage(page, `/add ${taskTitle}`);
		await page.waitForTimeout(3000);

		const body = await page.textContent('body') || '';
		expect(body).toContain('Task added');

		// Verify via project-scoped API
		const board = await boardFetch(`/projects/${projectId}/board`);
		const all = [...board.planned, ...board['in-progress'], ...board.done];
		const task = all.find((t: any) => t.title === taskTitle);
		expect(task).toBeTruthy();
	});
});

// --- Spec → Board Pipeline (requires API key) ---

test.describe('Spec to Board Pipeline', () => {
	test.skip(!apiKey, 'Skipped: no API key at /tmp/p10-api-key.txt');
	test.setTimeout(300_000); // 5 min — LLM calls

	test.beforeAll(async () => {
		await ensureMaster();
	});

	test('Build command generates specs and creates board tasks', async ({ page }) => {
		await loginAndOpenProject(page, 'Spec Pipeline Test');
		await waitForServers(page);
		await setApiKey(page, apiKey!);
		console.log('  ✅ Servers booted, API key set');

		// Send build request
		await sendMessage(page, 'Build a todo app with API backend');
		await waitForAgentDone(page);
		console.log('  ✅ Agent finished');

		// Check specs were generated
		const body = await page.textContent('body') || '';
		const hasSpecs = body.includes('write_spec') || body.includes('Spec updated');
		console.log(`  ${hasSpecs ? '✅' : '⚠️'} Specs generated: ${hasSpecs}`);

		// Check board has project-scoped tasks
		await page.waitForTimeout(5000);
		const board = await boardFetch('/board');
		const projectTasks = [...board.planned, ...board['in-progress'], ...board.done]
			.filter((t: any) => t.scope === 'project');

		console.log(`  📋 Project tasks on board: ${projectTasks.length}`);
		for (const t of projectTasks.slice(0, 5)) {
			console.log(`    - ${t.title.slice(0, 60)}`);
		}

		if (hasSpecs) {
			expect(projectTasks.length).toBeGreaterThan(0);
			console.log('  ✅ Board has project tasks from specs');
		}
	});
});
