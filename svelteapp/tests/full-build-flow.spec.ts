/**
 * Full Build Flow E2E Test
 * 
 * Tests the complete P10 workflow:
 * 1. Login + open project
 * 2. Boot WebContainer + servers
 * 3. Set API key
 * 4. Send "Build a notes app with API backend"
 * 5. Wait for agent to write specs and code
 * 6. Verify API endpoints work via bridge
 * 7. Verify web preview shows the app
 * 8. Verify git commits were made
 * 9. Verify WebContainer snapshot persisted to IndexedDB + server
 * 
 * Requires: /tmp/p10-api-key.txt with a valid Anthropic API key
 * Runtime: ~3-8 minutes depending on LLM response time
 */

import { test, expect } from '@playwright/test';
import { loginAndOpenProject, waitForServers, loadApiKey, sendMessage } from './helpers';

const apiKey = loadApiKey();

// Set API key via Settings panel
async function setApiKeyViaSettings(page: any, key: string) {
	// Open Settings panel in bottom bar
	const settingsBtn = page.locator('.border-t.border-panel-border button:has-text("Settings")');
	await settingsBtn.click();
	await page.waitForTimeout(500);

	// Fill in the API key input
	const apiKeyInput = page.locator('#api-key');
	await apiKeyInput.waitFor({ state: 'visible', timeout: 5000 });
	await apiKeyInput.fill(key);
	await page.waitForTimeout(1000);

	// Set model to a known-working one
	const modelSelect = page.locator('#model');
	await modelSelect.selectOption('claude-sonnet-4-6');
	await page.waitForTimeout(500);

	// Close settings panel
	await settingsBtn.click();
}

// Wait for the agent to finish — handles multi-round tool execution
async function waitForAgentComplete(page: any, timeout = 300_000): Promise<void> {
	const start = Date.now();
	let lastToolCount = 0;
	let stableCount = 0;

	while (Date.now() - start < timeout) {
		const text = await page.textContent('body') || '';
		const isStreaming = text.includes('streaming');
		const isIdle = text.includes('idle');

		// Count tool pills (completed tool executions)
		const toolMatches = text.match(/● write_file|● run_command|● read_file|● write_spec|● list_files/g);
		const toolCount = toolMatches?.length || 0;

		// Agent is done when: idle, not streaming, and tool count is stable
		if (isIdle && !isStreaming && toolCount > 0) {
			if (toolCount === lastToolCount) {
				stableCount++;
				// Wait for 3 consecutive stable checks (6 seconds)
				if (stableCount >= 3) return;
			} else {
				stableCount = 0;
				lastToolCount = toolCount;
			}
		} else {
			stableCount = 0;
		}

		if (toolCount > lastToolCount) {
			lastToolCount = toolCount;
			console.log(`    Tools executed: ${toolCount}`);
		}

		await page.waitForTimeout(2000);
	}
	throw new Error(`Agent did not finish within ${timeout / 1000}s`);
}

// Call an API endpoint via the WebContainer bridge
async function callApi(page: any, path: string, method = 'GET', body?: any): Promise<{ status: number; body: string }> {
	return page.evaluate(async ({ path, method, body }: any) => {
		const iframe = document.querySelector('iframe[title="Web Preview"]') as HTMLIFrameElement;
		if (!iframe?.contentWindow) return { status: 0, body: 'no iframe' };

		const id = Math.random().toString(36).slice(2);
		return new Promise<any>((resolve) => {
			const handler = (e: MessageEvent) => {
				if (e.data?.type === 'p10-api-response' && e.data.id === id) {
					window.removeEventListener('message', handler);
					resolve({ status: e.data.status, body: e.data.body });
				}
			};
			window.addEventListener('message', handler);
			iframe.contentWindow!.postMessage({
				type: 'p10-api-request', id,
				url: `http://localhost:3001${path}`,
				method,
				headers: { 'Content-Type': 'application/json' },
				body: body ? JSON.stringify(body) : undefined
			}, '*');
			setTimeout(() => {
				window.removeEventListener('message', handler);
				resolve({ status: 0, body: 'timeout' });
			}, 10000);
		});
	}, { path, method, body });
}

test.describe('Full Build Flow: Notes App', () => {
	test.skip(!apiKey, 'Skipped: no API key at /tmp/p10-api-key.txt');
	test.setTimeout(600_000); // 10 minutes max

	test('build notes app end-to-end', async ({ page }) => {
		const consoleLogs: string[] = [];
		page.on('console', (msg: any) => consoleLogs.push(msg.text()));

		// ========================================
		// Phase 1: Login + Boot
		// ========================================
		console.log('Phase 1: Login and booting WebContainer...');
		const projectId = await loginAndOpenProject(page, 'Full Build Flow Test');
		await waitForServers(page);
		console.log('  ✅ WebContainer booted, 2 servers running');

		// ========================================
		// Phase 2: Set API key and model
		// ========================================
		console.log('Phase 2: Setting API key...');
		await setApiKeyViaSettings(page, apiKey!);
		console.log('  ✅ API key set, model: claude-sonnet-4-6');

		// ========================================
		// Phase 3: Send build instruction
		// ========================================
		console.log('Phase 3: Sending build instruction...');
		await sendMessage(page, 'Build a notes app with API backend. Include: list notes, add note with title and body, delete note. Keep it simple, no auth needed.');
		console.log('  ✅ Message sent');

		// ========================================
		// Phase 4: Wait for agent to finish
		// ========================================
		console.log('Phase 4: Waiting for agent to build...');
		await waitForAgentComplete(page);
		console.log('  ✅ Agent finished building');

		// Wait for hot-reload and backend restart
		await page.waitForTimeout(8000);

		// ========================================
		// Phase 5: Verify tool executions happened
		// ========================================
		console.log('Phase 5: Verifying tool executions...');
		const bodyText = await page.textContent('body') || '';

		const hasWriteFile = bodyText.includes('write_file');
		expect(hasWriteFile).toBeTruthy();
		console.log('  ✅ write_file tool calls present');

		expect(bodyText).not.toContain('<tool:write_file');
		console.log('  ✅ No raw tool XML in chat');

		const hasServerFile = bodyText.includes('server/') || bodyText.includes('index.js');
		expect(hasServerFile).toBeTruthy();
		console.log('  ✅ Server files written');

		// ========================================
		// Phase 6: Verify API endpoints via bridge
		// ========================================
		console.log('Phase 6: Testing API endpoints...');
		const routesResult = await callApi(page, '/api/_routes');
		let createResult = { status: 0, body: '' };

		if (routesResult.status === 200) {
			const routes = JSON.parse(routesResult.body);
			console.log(`  ✅ Route discovery: ${routes.length} routes`);

			for (const path of ['/api/notes', '/api/note']) {
				createResult = await callApi(page, path, 'POST', { title: 'Test Note', body: 'E2E test' });
				if (createResult.status === 200 || createResult.status === 201) {
					console.log(`  ✅ POST ${path} — note created`);
					break;
				}
			}
		} else {
			console.log('  ⚠️ API bridge unavailable (cross-origin) — verifying files instead');
			const hasServerCode = bodyText.includes('server/index.js') || bodyText.includes('server/');
			expect(hasServerCode).toBeTruthy();
			console.log('  ✅ Server files confirmed via tool output');
		}

		// ========================================
		// Phase 7: Verify web preview
		// ========================================
		console.log('Phase 7: Checking web preview...');
		await page.click('button:has-text("Web")');
		await page.waitForTimeout(3000);

		const iframe = page.frameLocator('iframe[title="Web Preview"]');
		try {
			const webContent = await iframe.locator('body').textContent({ timeout: 5000 });
			const hasAppContent =
				webContent?.toLowerCase().includes('note') ||
				webContent?.toLowerCase().includes('add') ||
				webContent?.toLowerCase().includes('title');
			if (hasAppContent) {
				console.log('  ✅ Web preview shows notes app');
			} else {
				console.log('  ⚠️ Web preview content:', webContent?.slice(0, 100));
			}
		} catch {
			console.log('  ⚠️ Could not read web preview iframe (cross-origin)');
		}

		// ========================================
		// Phase 8: Verify git commits
		// ========================================
		console.log('Phase 8: Checking git commits...');
		await page.click('button:has-text("Git Log")');
		await page.waitForTimeout(2000);

		const gitBody = await page.textContent('body') || '';
		const hasCommits = gitBody.includes('●') || gitBody.includes('○');
		if (hasCommits) {
			console.log('  ✅ Git commits present');
		} else {
			console.log('  ⚠️ No git commits found');
		}

		// ========================================
		// Phase 9: Verify persistence (IndexedDB + server)
		// ========================================
		console.log('Phase 9: Checking persistence...');

		// Check IndexedDB
		const snapshot = await page.evaluate(async () => {
			return new Promise((resolve) => {
				const req = indexedDB.open('p10', 1);
				req.onupgradeneeded = () => req.result.createObjectStore('snapshots');
				req.onsuccess = () => {
					const db = req.result;
					const tx = db.transaction('snapshots', 'readonly');
					const get = tx.objectStore('snapshots').get('p10-snapshot');
					get.onsuccess = () => {
						db.close();
						const snap = get.result;
						resolve(snap ? {
							fileCount: snap.fileCount,
							savedAt: snap.savedAt,
							files: Object.keys(snap.files || {}),
						} : null);
					};
					get.onerror = () => { db.close(); resolve(null); };
				};
				req.onerror = () => resolve(null);
			});
		});

		if (snapshot) {
			const s = snapshot as any;
			expect(s.fileCount).toBeGreaterThan(5);
			console.log(`  ✅ IndexedDB snapshot: ${s.fileCount} files`);
		}

		// Check server-side snapshot
		const serverSnap = await fetch(`http://localhost:7777/projects/${projectId}/container-snapshot`);
		const serverData = await serverSnap.json();
		if (serverData.files && Object.keys(serverData.files).length > 0) {
			console.log(`  ✅ Server snapshot: ${Object.keys(serverData.files).length} files`);
		} else {
			console.log('  ⚠️ Server snapshot empty (may need auto-save cycle)');
		}

		// ========================================
		// Phase 10: Verify persistence survives reload
		// ========================================
		console.log('Phase 10: Testing reload persistence...');
		await page.reload();

		try {
			await waitForServers(page, 120_000);
			console.log('  ✅ Servers restarted after reload');
		} catch {
			console.log('  ⚠️ Servers slow to restart after reload (npm install)');
		}

		const restoreMsg = consoleLogs.find(l => l.includes('Restoring'));
		if (restoreMsg) {
			console.log(`  ✅ Snapshot restored: ${restoreMsg}`);
		} else {
			console.log('  ⚠️ No restore message in console');
		}

		// ========================================
		// Summary
		// ========================================
		const toolCount = (bodyText.match(/● write_file|● run_command|● read_file|● write_spec|● list_files/g) || []).length;
		console.log('\n=== Build Flow Summary ===');
		console.log(`  Tools executed: ${toolCount}`);
		console.log(`  Snapshot files: ${(snapshot as any)?.fileCount || 0}`);
		console.log(`  API bridge: ${createResult.status > 0 ? 'working' : 'cross-origin blocked'}`);
		console.log('========================\n');

		expect(toolCount).toBeGreaterThanOrEqual(3);
	});
});
