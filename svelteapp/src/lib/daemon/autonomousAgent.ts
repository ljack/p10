/**
 * Autonomous Agent — runs in the Browser Daemon.
 * Watches for errors and can request fixes from the Pi Daemon.
 */

import { browserDaemon } from './browserDaemon.svelte';
import { errorStore } from '$lib/stores/errors.svelte';
import { debugBus } from '$lib/debug/debugBus.svelte';

let watchInterval: ReturnType<typeof setInterval> | null = null;
let lastErrorCheck = '';
let fixAttempts = 0;
const MAX_FIX_ATTEMPTS = 3;

/**
 * Start the autonomous error watch loop.
 * When errors are detected and a Pi Daemon is available,
 * automatically requests a fix.
 */
export function startAutonomousWatch() {
	if (watchInterval) return;

	watchInterval = setInterval(async () => {
		if (!browserDaemon.connected) return;

		const errors = errorStore.getContext();
		if (!errors || errors === lastErrorCheck) return;
		if (fixAttempts >= MAX_FIX_ATTEMPTS) return;

		lastErrorCheck = errors;
		fixAttempts++;

		debugBus.log('event', 'autonomous', `Error detected, requesting fix (attempt ${fixAttempts})`, errors.slice(0, 200));

		try {
			// Ask Pi Daemon to fix the error
			browserDaemon.send('*', 'task', {
				taskId: `autofix-${Date.now()}`,
				instruction: `Fix the following build/runtime error in the P10 project:\n\n${errors}`,
				context: 'This is an auto-detected error from the browser preview. Please fix the code.',
				priority: 'high'
			});
		} catch (err) {
			debugBus.log('error', 'autonomous', `Failed to send fix request: ${err}`);
		}
	}, 10000); // Check every 10 seconds

	debugBus.log('event', 'autonomous', 'Error watch started');
}

/** Stop the autonomous watch */
export function stopAutonomousWatch() {
	if (watchInterval) {
		clearInterval(watchInterval);
		watchInterval = null;
	}
}

/** Reset fix attempts (e.g., after user sends a new message) */
export function resetFixAttempts() {
	fixAttempts = 0;
	lastErrorCheck = '';
}
