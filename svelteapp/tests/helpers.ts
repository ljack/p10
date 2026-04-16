import { type Page } from '@playwright/test';
import * as fs from 'fs';

const MASTER_URL = 'http://localhost:7777';
const TEST_USERNAME = 'playwright-test';

/**
 * Login and navigate to a project workspace.
 * Creates a test user + project if they don't exist.
 * Returns the project ID.
 */
export async function loginAndOpenProject(page: Page, projectName = 'E2E Test Project'): Promise<string> {
	// Create user via API
	const loginResp = await fetch(`${MASTER_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username: TEST_USERNAME }),
	});
	const { user } = await loginResp.json();

	// Find or create project
	const listResp = await fetch(`${MASTER_URL}/projects?ownerId=${user.id}`);
	const { projects } = await listResp.json();
	let project = projects.find((p: any) => p.name === projectName && p.status === 'active');

	if (!project) {
		const createResp = await fetch(`${MASTER_URL}/projects`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: projectName, ownerId: user.id }),
		});
		project = await createResp.json();
	}

	// Login via the browser UI
	await page.goto('/');
	const input = page.locator('input[placeholder="Enter username"]');
	await input.fill(TEST_USERNAME);
	await page.locator('button:has-text("Login")').click();

	// Should redirect to dashboard
	await page.waitForURL('/dashboard', { timeout: 10000 });

	// Click on the project (or navigate directly)
	await page.goto(`/projects/${project.id}`);
	await page.waitForSelector('[class*="bg-background"]', { timeout: 10000 });

	return project.id;
}

/**
 * Wait for both WebContainer servers (frontend + backend) to be ready.
 * Polls the page body text for "2 servers" indicator.
 */
export async function waitForServers(page: Page, timeout = 90_000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const text = await page.textContent('body');
		if (text?.includes('2 servers')) return;
		await page.waitForTimeout(3000);
	}
	throw new Error(`Servers did not start within ${timeout / 1000}s`);
}

/**
 * Wait for the agent to finish streaming (no "streaming" indicator and has tool results).
 */
export async function waitForAgentDone(page: Page, timeout = 180_000): Promise<void> {
	const start = Date.now();
	let sawStreaming = false;
	while (Date.now() - start < timeout) {
		const text = await page.textContent('body') || '';
		const isStreaming = text.includes('streaming');
		if (isStreaming) sawStreaming = true;

		// Agent is done when: it was streaming, now it's not, and there's tool output
		const hasTool = text.includes('write_file') || text.includes('run_command') || text.includes('read_file') || text.includes('write_spec');
		const isIdle = text.includes('idle') && !isStreaming;

		if (sawStreaming && isIdle && hasTool) return;

		// Also accept if agent responded but no tools (e.g., just text)
		if (sawStreaming && isIdle && !isStreaming) {
			// Wait a bit more in case tools are still processing
			await page.waitForTimeout(3000);
			const text2 = await page.textContent('body') || '';
			if (!text2.includes('streaming')) return;
		}

		await page.waitForTimeout(2000);
	}
	throw new Error(`Agent did not finish within ${timeout / 1000}s`);
}

/**
 * Load the API key from /tmp/p10-api-key.txt.
 * Tests requiring the AI agent will skip if no key is available.
 */
export function loadApiKey(): string | null {
	try {
		return fs.readFileSync('/tmp/p10-api-key.txt', 'utf-8').trim();
	} catch {
		return null;
	}
}

/**
 * Enter API key into the chat and wait for confirmation.
 */
export async function setApiKey(page: Page, apiKey: string): Promise<void> {
	const textarea = page.locator('textarea');
	await textarea.fill(apiKey);
	await textarea.press('Enter');
	await page.waitForTimeout(2000);
}

/**
 * Send a chat message and return immediately (don't wait for response).
 */
export async function sendMessage(page: Page, message: string): Promise<void> {
	const textarea = page.locator('textarea');
	await textarea.fill(message);
	await textarea.press('Enter');
}
