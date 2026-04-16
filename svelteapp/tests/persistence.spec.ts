import { test, expect } from '@playwright/test';
import { loginAndOpenProject, waitForServers } from './helpers';

test.describe('WebContainer Persistence', () => {
	test('snapshot is saved to IndexedDB after boot', async ({ page }) => {
		const consoleLogs: string[] = [];
		page.on('console', (msg) => consoleLogs.push(msg.text()));

		await loginAndOpenProject(page, 'Persistence Test');
		await waitForServers(page);

		// Wait for the initial snapshot save (happens after boot for fresh starts)
		await page.waitForTimeout(5000);

		// Check IndexedDB has a snapshot
		const snapshot = await page.evaluate(async () => {
			return new Promise((resolve) => {
				const req = indexedDB.open('p10', 1);
				req.onupgradeneeded = () => {
					req.result.createObjectStore('snapshots');
				};
				req.onsuccess = () => {
					const db = req.result;
					const tx = db.transaction('snapshots', 'readonly');
					const get = tx.objectStore('snapshots').get('p10-snapshot');
					get.onsuccess = () => {
						db.close();
						const snap = get.result;
						if (snap) {
							resolve({
								fileCount: snap.fileCount,
								savedAt: snap.savedAt,
								hasFiles: Object.keys(snap.files || {}).length > 0,
								sampleFiles: Object.keys(snap.files || {}).slice(0, 5),
							});
						} else {
							resolve(null);
						}
					};
					get.onerror = () => { db.close(); resolve(null); };
				};
				req.onerror = () => resolve(null);
			});
		});

		expect(snapshot).not.toBeNull();
		expect((snapshot as any).hasFiles).toBe(true);
		expect((snapshot as any).fileCount).toBeGreaterThan(3);
		console.log(`Snapshot saved: ${(snapshot as any).fileCount} files at ${(snapshot as any).savedAt}`);
	});

	test('server snapshot is synced on save', async ({ page }) => {
		const consoleLogs: string[] = [];
		page.on('console', (msg) => consoleLogs.push(msg.text()));

		const projectId = await loginAndOpenProject(page, 'Persistence Test');
		await waitForServers(page);

		// Wait for auto-save to push to server
		await page.waitForTimeout(35000);

		// Check that the server has a snapshot for this project
		const resp = await fetch(`http://localhost:7777/projects/${projectId}/container-snapshot`);
		const data = await resp.json();
		expect(data.files).toBeTruthy();
		expect(Object.keys(data.files).length).toBeGreaterThan(0);
		console.log(`Server snapshot: ${Object.keys(data.files).length} files`);
	});

	test('auto-save triggers periodically', async ({ page }) => {
		const consoleLogs: string[] = [];
		page.on('console', (msg) => consoleLogs.push(msg.text()));

		await loginAndOpenProject(page, 'Persistence Test');
		await waitForServers(page);

		// Wait for at least one auto-save cycle (30s) + buffer
		await page.waitForTimeout(35000);

		const snapshotLogs = consoleLogs.filter(l => l.includes('Snapshot saved'));
		console.log(`Snapshot save logs: ${snapshotLogs.length}`);
		snapshotLogs.forEach(l => console.log(`  ${l}`));

		expect(snapshotLogs.length).toBeGreaterThanOrEqual(1);
	});
});
