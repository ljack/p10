import { test, expect } from '@playwright/test';
import { waitForServers } from './helpers';

test.describe('Platform Boot', () => {
	test('page loads with correct title and layout', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle('P10 — AI Development Platform');

		// Core layout elements
		await expect(page.locator('text=P10').first()).toBeVisible();
		await expect(page.locator('text=CHAT')).toBeVisible();
		await expect(page.getByText('PREVIEW', { exact: true })).toBeVisible();
		await expect(page.getByText('AGENTS', { exact: true })).toBeVisible();
	});

	test('preview tabs are present', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('button:has-text("Web")')).toBeVisible();
		await expect(page.locator('button:has-text("API")')).toBeVisible();
		await expect(page.locator('button:has-text("Mobile")')).toBeVisible();
	});

	test('bottom bar tabs are present', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('button:has-text("Files")')).toBeVisible();
		await expect(page.locator('button:has-text("Git Log")')).toBeVisible();
		await expect(page.locator('button:has-text("Specs")')).toBeVisible();
		await expect(page.locator('button:has-text("Tests")')).toBeVisible();
		await expect(page.locator('.border-t.border-panel-border button:has-text("Settings")')).toBeVisible();
	});

	test('COEP/COOP headers are set', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
		expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin');
	});

	test('WebContainer boots and both servers start', async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);
		const body = await page.textContent('body');
		expect(body).toContain('2 servers running');
	});

	test('web preview iframe renders after boot', async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);
		await page.waitForTimeout(3000);

		const iframe = page.locator('iframe[title="Web Preview"]');
		await expect(iframe).toBeVisible();

		// Check iframe loaded (cross-origin frame content may not be readable)
		const src = await iframe.getAttribute('src');
		expect(src).toBeTruthy();
		expect(src).toContain('webcontainer');
	});

	test('API explorer shows backend detected', async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);

		await page.click('button:has-text("API")');
		await page.waitForTimeout(1000);

		// Should show the request builder, not "No API server detected"
		await expect(page.locator('button:has-text("Send")')).toBeVisible();
	});

	test('API health endpoint responds via bridge', async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);
		// Give the iframe time to fully load the React app + bridge script
		await page.waitForTimeout(8000);

		const result = await page.evaluate(async () => {
			const iframe = document.querySelector('iframe[title="Web Preview"]') as HTMLIFrameElement;
			if (!iframe?.contentWindow) return { error: 'no iframe' };

			return new Promise<any>((resolve) => {
				window.addEventListener('message', (e: MessageEvent) => {
					if (e.data?.type === 'p10-api-response') resolve(e.data);
				});
				iframe.contentWindow!.postMessage({
					type: 'p10-api-request', id: 'test',
					url: 'http://localhost:3001/api/health',
					method: 'GET', headers: {}
				}, '*');
				setTimeout(() => resolve({ error: 'timeout' }), 10000);
			});
		});

		if (result.error) {
			// Bridge didn't respond — might be a timing issue in CI
			console.log('Bridge result:', JSON.stringify(result));
		}
		expect(result.error).toBeUndefined();
		expect(result.status).toBe(200);
		expect(result.body).toContain('ok');
	});

	test('mobile preview renders in phone frame', async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);

		// Use force click since the always-mounted iframe may overlap the tab button
		await page.locator('button:has-text("Mobile")').click({ force: true });
		await page.waitForTimeout(2000);

		const mobileFrame = page.locator('iframe[title="Mobile Preview"]');
		await expect(mobileFrame).toBeVisible();
		await expect(page.getByText('iPhone SE', { exact: false })).toBeVisible();
	});

	test('file browser shows project files', async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);

		await page.click('button:has-text("Files")');
		await page.waitForTimeout(2000);

		const body = await page.textContent('body');
		expect(body).toContain('package.json');
		expect(body).toContain('src/');
	});

	test('git log shows initial commit after boot', async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);
		await page.waitForTimeout(5000); // Wait for git init

		await page.click('button:has-text("Git Log")');
		await page.waitForTimeout(2000);

		const body = await page.textContent('body');
		expect(body).toContain('Initial project scaffold');
	});

	test('settings panel saves API key', async ({ page }) => {
		await page.goto('/');

		// Click the bottom bar Settings (not top bar)
		await page.locator('.border-t.border-panel-border button:has-text("Settings")').click();
		await page.waitForTimeout(500);

		const keyInput = page.locator('#api-key');
		await expect(keyInput).toBeVisible();

		await keyInput.fill('sk-ant-test-key');
		await page.waitForTimeout(500);

		await expect(page.getByText('✓ saved')).toBeVisible();
	});
});
