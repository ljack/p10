import { test, expect } from '@playwright/test';
import { loginAndOpenProject, waitForServers, loadApiKey, setApiKey, sendMessage, waitForAgentDone } from './helpers';

const apiKey = loadApiKey();

test.describe('AI Agent', () => {
	test.skip(!apiKey, 'Skipped: no API key at /tmp/p10-api-key.txt');

	test.beforeEach(async ({ page }) => {
		await loginAndOpenProject(page, 'Agent Test Project');
		await waitForServers(page);
		await setApiKey(page, apiKey!);
	});

	test('agent accepts API key via chat', async ({ page }) => {
		const body = await page.textContent('body');
		expect(body).toContain('API key saved');
	});

	test('agent builds a todo app with file writes', async ({ page }) => {
		await sendMessage(page, 'Build a simple todo app with an API backend. Use express for the API and React for the frontend.');
		await waitForAgentDone(page);

		const body = await page.textContent('body') || '';
		// Agent should have used write_file tool
		expect(body).toContain('write_file');
	});
});
