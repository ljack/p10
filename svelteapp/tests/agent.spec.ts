import { test, expect } from '@playwright/test';
import { waitForServers, waitForAgentDone, loadApiKey, setApiKey, sendMessage } from './helpers';

const apiKey = loadApiKey();

test.describe('AI Agent', () => {
	test.skip(!apiKey, 'Skipped: no API key at /tmp/p10-api-key.txt');

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);
		await setApiKey(page, apiKey!);
	});

	test('agent accepts API key via chat', async ({ page }) => {
		const body = await page.textContent('body');
		expect(body).toContain('API key saved');
	});

	test('agent builds a todo app with file writes', async ({ page }) => {
		await sendMessage(page, 'Build a simple todo app with add and delete');
		await waitForAgentDone(page);

		const body = await page.textContent('body');

		// Should have written files
		expect(body).toContain('write_file');
		expect(body).toContain('Written:');
		expect(body).toMatch(/src\/App\.(jsx|css)/);
	});

	test('todo app renders in web preview after build', async ({ page }) => {
		await sendMessage(page, 'Build a simple todo app');
		await waitForAgentDone(page);
		await page.waitForTimeout(5000); // Hot-reload

		await page.click('button:has-text("Web")');
		await page.waitForTimeout(3000);

		const iframe = page.frameLocator('iframe[title="Web Preview"]');
		const content = await iframe.locator('body').textContent({ timeout: 10000 });
		const hasTodo =
			content?.toLowerCase().includes('todo') ||
			content?.toLowerCase().includes('task') ||
			content?.toLowerCase().includes('add');
		expect(hasTodo).toBeTruthy();
	});

	test('todo app renders in mobile preview', async ({ page }) => {
		await sendMessage(page, 'Build a simple todo app');
		await waitForAgentDone(page);
		await page.waitForTimeout(5000);

		await page.click('button:has-text("Mobile")');
		await page.waitForTimeout(3000);

		const mobileFrame = page.locator('iframe[title="Mobile Preview"]');
		await expect(mobileFrame).toBeVisible();
	});

	test('git auto-commits after agent builds', async ({ page }) => {
		await sendMessage(page, 'Build a simple counter app');
		await waitForAgentDone(page);
		await page.waitForTimeout(3000);

		await page.click('button:has-text("Git Log")');
		await page.waitForTimeout(2000);

		const body = await page.textContent('body');
		// Should have more than just the initial commit
		const commitMarkers = body?.match(/●|○/g) || [];
		expect(commitMarkers.length).toBeGreaterThanOrEqual(2);
	});

	test('server start commands are blocked', async ({ page }) => {
		await sendMessage(page, 'Run npm run dev to start the server');
		await waitForAgentDone(page);

		const body = await page.textContent('body');
		// Should see "Skipped" message if agent tried to run dev
		// Or agent should just not try based on the system prompt
		expect(body).not.toContain('Exit 0');
	});
});
