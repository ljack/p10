import { defineConfig } from '@playwright/test';

// Build under test: each project points to one UI + its API.
export default defineConfig({
	testDir: '.',
	testMatch: /.*\.spec\.ts$/,
	retries: 0,
	fullyParallel: false,
	workers: 1,
	reporter: [['list'], ['json', { outputFile: '../reports/e2e-results.json' }]],
	use: {
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
	},
	projects: [
		{
			name: 'opus-4-6',
			use: { baseURL: 'http://localhost:9696' },
			metadata: { build: 'opus-4-6', apiUrl: 'http://localhost:4646' },
		},
		{
			name: 'opus-4-7',
			use: { baseURL: 'http://localhost:9797' },
			metadata: { build: 'opus-4-7', apiUrl: 'http://localhost:4747' },
		},
		{
			name: 'sonnet-4-6',
			use: { baseURL: 'http://localhost:9595' },
			metadata: { build: 'sonnet-4-6', apiUrl: 'http://localhost:4545' },
		},
		{
			name: 'gpt-5-3-codex',
			use: { baseURL: 'http://localhost:9090' },
			metadata: { build: 'gpt-5-3-codex', apiUrl: 'http://localhost:4040' },
		},
		{
			name: 'gpt-5-4',
			use: { baseURL: 'http://localhost:9191' },
			metadata: { build: 'gpt-5-4', apiUrl: 'http://localhost:4141' },
		},
	],
});
