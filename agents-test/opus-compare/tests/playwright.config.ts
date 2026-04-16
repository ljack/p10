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
			use: {
				baseURL: 'http://localhost:9696',
			},
			metadata: {
				build: 'opus-4-6',
				uiUrl: 'http://localhost:9696',
				apiUrl: 'http://localhost:4646',
			},
		},
		{
			name: 'opus-4-7',
			use: {
				baseURL: 'http://localhost:9797',
			},
			metadata: {
				build: 'opus-4-7',
				uiUrl: 'http://localhost:9797',
				apiUrl: 'http://localhost:4747',
			},
		},
	],
});
