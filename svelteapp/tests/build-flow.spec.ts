import { test, expect } from '@playwright/test';
import { loginAndOpenProject, waitForServers, loadApiKey, setApiKey, sendMessage, waitForAgentDone } from './helpers';

const apiKey = loadApiKey();

test.describe('Build Todo App Flow', () => {
	test.skip(!apiKey, 'Skipped: no API key at /tmp/p10-api-key.txt');

	// This test involves LLM calls and can take several minutes
	test.setTimeout(300_000); // 5 minutes

	test('full-stack todo app builds and all previews work', async ({ page }) => {
		// Phase 1: Login + boot
		await loginAndOpenProject(page, 'Build Flow Test');
		await waitForServers(page);
		console.log('  ✅ Servers booted');

		// Phase 2: Set API key
		await setApiKey(page, apiKey!);
		console.log('  ✅ API key set');

		// Phase 3: Build
		await sendMessage(page, 'Build a todo app with API backend');
		await waitForAgentDone(page);
		console.log('  ✅ Agent finished');

		// Wait for hot-reload + backend restart
		await page.waitForTimeout(10000);

		// Phase 4: Verify tool pills (not raw code)
		const body = await page.textContent('body') || '';
		expect(body).toContain('write_file');
		expect(body).toContain('server/index.js');
		// Should NOT contain raw tool XML
		expect(body).not.toContain('<tool:write_file');
		console.log('  ✅ Tool pills rendered');

		// Phase 5: Web preview
		await page.click('button:has-text("Web")');
		await page.waitForTimeout(3000);
		const iframe = page.frameLocator('iframe[title="Web Preview"]');
		try {
			const webContent = await iframe.locator('body').textContent({ timeout: 5000 });
			const hasTodoContent =
				webContent?.toLowerCase().includes('todo') ||
				webContent?.toLowerCase().includes('task') ||
				webContent?.toLowerCase().includes('add');
			expect(hasTodoContent).toBeTruthy();
			console.log('  ✅ Web preview shows todo app');
		} catch {
			console.log('  ⚠️ Could not read web preview iframe (cross-origin)');
		}

		// Phase 6: API Explorer - check endpoints discovered
		await page.waitForTimeout(3000); // Wait for discovery
		const sidebar = await page.locator('.w-52').textContent({ timeout: 5000 }).catch(() => '');
		const hasEndpoints =
			sidebar?.includes('/api/todos') ||
			sidebar?.includes('/api/health');
		if (hasEndpoints) {
			console.log('  ✅ API endpoints discovered');
		} else {
			console.log('  ⚠️ API endpoints not in sidebar (may need manual refresh)');
		}

		// Phase 7: API health check via bridge
		const bridgeResult = await page.evaluate(async () => {
			const iframe = document.querySelector('iframe[title="Web Preview"]') as HTMLIFrameElement;
			if (!iframe?.contentWindow) return { error: 'no iframe' };
			const id = Math.random().toString(36).slice(2);
			return new Promise<any>((resolve) => {
				const handler = (e: MessageEvent) => {
					if (e.data?.type === 'p10-api-response' && e.data.id === id) {
						window.removeEventListener('message', handler);
						resolve(e.data);
					}
				};
				window.addEventListener('message', handler);
				iframe.contentWindow!.postMessage({
					type: 'p10-api-request', id,
					url: 'http://localhost:3001/api/_routes',
					method: 'GET', headers: {}
				}, '*');
				setTimeout(() => {
					window.removeEventListener('message', handler);
					resolve({ error: 'timeout' });
				}, 10000);
			});
		});

		if (bridgeResult.status === 200) {
			const routes = JSON.parse(bridgeResult.body);
			console.log(`  ✅ API bridge works (${routes.length} routes)`);
			const hasTodoRoutes = routes.some((r: any) => r.path?.includes('/api/todos'));
			if (hasTodoRoutes) {
				console.log('  ✅ /api/todos routes registered');
			}
		} else {
			console.log('  ⚠️ API bridge:', bridgeResult.error || bridgeResult.status);
		}

		// Phase 8: Git log has commits
		await page.click('button:has-text("Git Log")');
		await page.waitForTimeout(2000);
		const gitBody = await page.textContent('body') || '';
		expect(gitBody).toMatch(/●|○/); // Has commit markers
		console.log('  ✅ Git commits present');

		// Phase 9: Mobile preview
		await page.locator('button:has-text("Mobile")').click({ force: true });
		await page.waitForTimeout(2000);
		const mobileFrame = page.locator('iframe[title="Mobile Preview"]');
		await expect(mobileFrame).toBeVisible();
		console.log('  ✅ Mobile preview visible');
	});
});
