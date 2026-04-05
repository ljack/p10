import { type Page } from '@playwright/test';
import * as fs from 'fs';

/**
 * Wait for both WebContainer servers (frontend + backend) to be ready.
 * Polls the page body text for "2 servers" indicator.
 */
export async function waitForServers(page: Page, timeout = 90_000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const text = await page.textContent('body');
		if (text?.includes('2 servers')) return;
		await page.waitForTimeout(3000);
	}
	throw new Error(`Servers did not start within ${timeout / 1000}s`);
}

/**
 * Wait for the agent to finish streaming (no "streaming" indicator and has tool results).
 */
export async function waitForAgentDone(page: Page, timeout = 180_000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const text = await page.textContent('body') || '';
		const isStreaming = text.includes('streaming');
		const hasWritten = text.includes('Written:');
		if (!isStreaming && hasWritten) return;
		await page.waitForTimeout(2000);
	}
	throw new Error(`Agent did not finish within ${timeout / 1000}s`);
}

/**
 * Load the API key from /tmp/p10-api-key.txt.
 * Tests requiring the AI agent will skip if no key is available.
 */
export function loadApiKey(): string | null {
	try {
		return fs.readFileSync('/tmp/p10-api-key.txt', 'utf-8').trim();
	} catch {
		return null;
	}
}

/**
 * Enter API key into the chat and wait for confirmation.
 */
export async function setApiKey(page: Page, apiKey: string): Promise<void> {
	const textarea = page.locator('textarea');
	await textarea.fill(apiKey);
	await textarea.press('Enter');
	await page.waitForTimeout(2000);
}

/**
 * Send a chat message and return immediately (don't wait for response).
 */
export async function sendMessage(page: Page, message: string): Promise<void> {
	const textarea = page.locator('textarea');
	await textarea.fill(message);
	await textarea.press('Enter');
}
