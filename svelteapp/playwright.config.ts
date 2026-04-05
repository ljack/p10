import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 120_000, // 2 min per test — WebContainer boot is slow
	expect: { timeout: 10_000 },
	fullyParallel: false, // WebContainer can only run one instance at a time
	retries: 0,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://localhost:3333',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		launchOptions: {
			args: ['--enable-features=SharedArrayBuffer']
		}
	},
	webServer: {
		command: 'npx vite dev --port 3333',
		port: 3333,
		reuseExistingServer: true,
		timeout: 15_000
	}
});
