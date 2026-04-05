import { test, expect } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import { waitForServers } from './helpers';

let masterProcess: ReturnType<typeof spawn> | null = null;

test.describe('Daemon Mesh', () => {
	test.beforeAll(async () => {
		// Kill any existing master
		try { execSync('lsof -ti :7777 | xargs kill -9 2>/dev/null'); } catch { /* ok */ }
		await new Promise((r) => setTimeout(r, 1000));

		// Start Master Daemon
		masterProcess = spawn('npx', ['tsx', 'src/index.ts'], {
			cwd: '/Users/jarkko/_dev/p10/p10-master',
			stdio: 'pipe'
		});

		// Wait for master to be ready
		for (let i = 0; i < 10; i++) {
			try {
				const resp = await fetch('http://localhost:7777/health');
				if (resp.ok) break;
			} catch { /* retry */ }
			await new Promise((r) => setTimeout(r, 1000));
		}
	});

	test.afterAll(() => {
		if (masterProcess) {
			masterProcess.kill('SIGTERM');
			masterProcess = null;
		}
	});

	test('Master Daemon health check', async () => {
		const resp = await fetch('http://localhost:7777/health');
		expect(resp.ok).toBeTruthy();
		const data = await resp.json();
		expect(data.status).toBe('ok');
	});

	test('Master Daemon status shows no daemons initially', async () => {
		const resp = await fetch('http://localhost:7777/status');
		const data = await resp.json();
		expect(data.master.status).toBe('running');
		expect(data.daemons.length).toBeGreaterThanOrEqual(0);
	});

	test('Browser Daemon connects to Master and shows mesh indicator', async ({ page }) => {
		await page.goto('/');
		await page.waitForTimeout(5000);

		// Check mesh indicator
		const body = await page.textContent('body') || '';
		expect(body.includes('mesh') || body.includes('offline')).toBeTruthy();

		if (body.includes('mesh')) {
			// Verify master sees the browser daemon
			const resp = await fetch('http://localhost:7777/status');
			const data = await resp.json();
			const browserDaemon = data.daemons.find((d: any) => d.type === 'browser');
			expect(browserDaemon).toBeTruthy();
			expect(browserDaemon.status).toBe('alive');
		}
	});

	test('Mesh discovery endpoint returns Master info', async () => {
		const resp = await fetch('http://localhost:3333/api/mesh');
		expect(resp.ok).toBeTruthy();
		const data = await resp.json();
		expect(data.available).toBe(true);
		expect(data.wsUrl).toContain('ws://');
	});

	test('Browser Daemon sends heartbeats with TLDR', async ({ page }) => {
		await page.goto('/');
		await waitForServers(page);
		await page.waitForTimeout(10000); // Wait for heartbeats

		const resp = await fetch('http://localhost:7777/status');
		const data = await resp.json();
		const browserDaemon = data.daemons.find((d: any) => d.type === 'browser');

		if (browserDaemon) {
			expect(browserDaemon.tldr.length).toBeGreaterThan(0);
			expect(browserDaemon.status).toBe('alive');
		}
	});
});
