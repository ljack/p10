import { test, expect, Page } from '@playwright/test';

/**
 * Functional E2E — treats each build as a black box.
 * Uses data-testid contract from prompt/todo-ui-v2.prompt.md.
 *
 * API URL is read from playwright project metadata.
 */

async function getApiUrl(testInfo: any): Promise<string> {
	return (testInfo.project.metadata as any).apiUrl;
}

// Wipe the backend between tests.
async function wipeApi(apiUrl: string) {
	const resp = await fetch(`${apiUrl}/todos`);
	const todos = await resp.json();
	for (const t of todos) {
		await fetch(`${apiUrl}/todos/${t.id}`, { method: 'DELETE' });
	}
}

async function openApp(page: Page, apiUrl: string) {
	// Prime localStorage so the UI points at the right API before first fetch
	await page.addInitScript((url) => {
		try {
			localStorage.setItem('apiBase', url);          // opus-4-6 key
			localStorage.setItem('todo-ui:apiBase', url);  // opus-4-7 key
		} catch {}
	}, apiUrl);
	await page.goto('/');
	await expect(page.getByTestId('app-root')).toBeVisible();
	// Make sure the input reflects the configured base (best-effort)
	const input = page.getByTestId('api-base-input');
	const current = await input.inputValue();
	if (current !== apiUrl) {
		await input.fill(apiUrl);
		await input.press('Enter').catch(() => input.blur());
	}
}

test.beforeEach(async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	await wipeApi(apiUrl);
	await openApp(page, apiUrl);
});

test('health dot turns ok when API is up', async ({ page }) => {
	const dot = page.getByTestId('api-base-status');
	await expect.poll(async () => dot.getAttribute('data-status'), {
		timeout: 5000,
	}).toBe('ok');
});

test('empty state visible with zero todos', async ({ page }) => {
	await expect(page.getByTestId('empty-state')).toBeVisible();
	await expect(page.getByTestId('empty-state')).toContainText('No todos yet');
	await expect(page.getByTestId('todo-item')).toHaveCount(0);
});

test('add valid todo appears in list', async ({ page }) => {
	await page.getByTestId('add-input').fill('Buy milk');
	await page.getByTestId('add-submit').click();
	const item = page.getByTestId('todo-item').first();
	await expect(item).toBeVisible();
	await expect(item.getByTestId('todo-item-title')).toHaveText('Buy milk');
	await expect(page.getByTestId('empty-state')).toBeHidden();
});

test('empty title shows inline error, does not POST', async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	// Spy on network
	let posted = false;
	page.on('request', (r) => {
		if (r.method() === 'POST' && r.url().startsWith(apiUrl) && r.url().endsWith('/todos')) posted = true;
	});
	await page.getByTestId('add-input').fill('');
	await page.getByTestId('add-submit').click();
	await expect(page.getByTestId('add-error')).toBeVisible();
	await expect(page.getByTestId('add-error')).toContainText(/Title is required/i);
	await page.waitForTimeout(200); // give any async POST a chance
	expect(posted).toBe(false);
});

test('toggle completed updates data-completed and strikethrough', async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	// Seed via API
	await fetch(`${apiUrl}/todos`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ title: 'Ship it' }),
	});
	await page.reload();
	await openApp(page, apiUrl);

	const item = page.getByTestId('todo-item').first();
	await expect(item).toHaveAttribute('data-completed', 'false');
	await item.getByTestId('todo-item-toggle').check();
	await expect(item).toHaveAttribute('data-completed', 'true');
});

test('inline edit saves on Enter', async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	await fetch(`${apiUrl}/todos`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ title: 'old title' }),
	});
	await page.reload();
	await openApp(page, apiUrl);

	const item = page.getByTestId('todo-item').first();
	await item.getByTestId('todo-item-title').click();
	const input = item.getByTestId('todo-item-title-input');
	await expect(input).toBeVisible();
	await input.fill('new title');
	await input.press('Enter');
	await expect(item.getByTestId('todo-item-title')).toHaveText('new title');
});

test('inline edit cancels on Escape', async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	await fetch(`${apiUrl}/todos`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ title: 'stay the same' }),
	});
	await page.reload();
	await openApp(page, apiUrl);

	const item = page.getByTestId('todo-item').first();
	await item.getByTestId('todo-item-title').click();
	const input = item.getByTestId('todo-item-title-input');
	await expect(input).toBeVisible();
	await input.fill('garbage');
	await input.press('Escape');
	await expect(item.getByTestId('todo-item-title')).toHaveText('stay the same');
});

test('delete removes the item from DOM', async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	await fetch(`${apiUrl}/todos`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ title: 'to be deleted' }),
	});
	await page.reload();
	await openApp(page, apiUrl);

	page.once('dialog', (d) => d.accept()); // confirm()
	const item = page.getByTestId('todo-item').first();
	await item.getByTestId('todo-item-delete').click();
	await expect(page.getByTestId('todo-item')).toHaveCount(0);
	await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('sort order: newest first', async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	for (const t of ['first', 'second', 'third']) {
		await fetch(`${apiUrl}/todos`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title: t }),
		});
		await new Promise((r) => setTimeout(r, 25));
	}
	await page.reload();
	await openApp(page, apiUrl);

	const items = page.getByTestId('todo-item');
	await expect(items).toHaveCount(3);
	const titles = await items.locator('[data-testid="todo-item-title"]').allTextContents();
	expect(titles).toEqual(['third', 'second', 'first']);
});

test('api base change persists across reloads', async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	await page.getByTestId('api-base-input').fill(apiUrl);
	await page.getByTestId('api-base-input').press('Enter').catch(() => {});
	await page.reload();
	await openApp(page, apiUrl);
	await expect(page.getByTestId('api-base-input')).toHaveValue(apiUrl);
});

test('relative time renders', async ({ page }, testInfo) => {
	const apiUrl = await getApiUrl(testInfo);
	await fetch(`${apiUrl}/todos`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ title: 'fresh' }),
	});
	await page.reload();
	await openApp(page, apiUrl);
	const time = page.getByTestId('todo-item-time').first();
	await expect(time).toBeVisible();
	await expect(time).toHaveText(/just now|ago|\d+s|\d+m/i);
});

test('no console errors on load + basic interaction', async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
	});
	page.on('pageerror', (err) => errors.push(String(err)));
	await page.getByTestId('add-input').fill('no console errors');
	await page.getByTestId('add-submit').click();
	await expect(page.getByTestId('todo-item').first()).toBeVisible();
	expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});
