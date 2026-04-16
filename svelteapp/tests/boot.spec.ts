import { test, expect } from '@playwright/test';
import { loginAndOpenProject, waitForServers } from './helpers';

test.describe('Platform Boot', () => {
	test('login page loads with correct layout', async ({ page }) => {
		await page.goto('/');
		// Login page should show P10 branding and login form
		await expect(page.locator('h1:has-text("P10")')).toBeVisible();
		await expect(page.locator('input[placeholder="Enter username"]')).toBeVisible();
		await expect(page.locator('button:has-text("Login")')).toBeVisible();
		await expect(page.locator('text=AI Development Platform')).toBeVisible();
	});

	test('login and redirect to dashboard', async ({ page }) => {
		await page.goto('/');
		await page.locator('input[placeholder="Enter username"]').fill('boot-test');
		await page.locator('button:has-text("Login")').click();
		await page.waitForURL('/dashboard', { timeout: 10000 });
		await expect(page.locator('text=Your Projects')).toBeVisible();
	});

	test('workspace loads with correct layout after project open', async ({ page }) => {
		await loginAndOpenProject(page, 'Boot Test Project');
		await expect(page.locator('text=P10').first()).toBeVisible();
		await expect(page.locator('text=CHAT')).toBeVisible();
		await expect(page.getByText('PREVIEW', { exact: true })).toBeVisible();
		await expect(page.getByText('AGENTS', { exact: true })).toBeVisible();
	});

	test('preview tabs are present', async ({ page }) => {
		await loginAndOpenProject(page, 'Boot Test Project');
		await expect(page.locator('button:has-text("Web")')).toBeVisible();
		await expect(page.locator('button:has-text("API")')).toBeVisible();
		await expect(page.locator('button:has-text("Mobile")')).toBeVisible();
	});

	test('WebContainer boots and shows status', async ({ page }) => {
		await loginAndOpenProject(page, 'Boot Test Project');
		// Wait for container to boot (shows in bottom bar)
		await page.waitForTimeout(5000);
		const body = await page.textContent('body');
		// Should show some container status
		expect(body).toMatch(/booting|ready|server/i);
	});

	test('unauthenticated access redirects to login', async ({ page }) => {
		await page.goto('/dashboard');
		await page.waitForURL('/', { timeout: 5000 });
	});
});
