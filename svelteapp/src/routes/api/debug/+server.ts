import { readFileSync } from 'fs';
import type { RequestHandler } from './$types';

const LOG_FILE = '/tmp/p10-debug.log';

/**
 * Option C: State snapshot + recent logs
 * 
 * The browser pushes state snapshots here periodically.
 * CLI agent can GET to read the latest state.
 */

let lastSnapshot: any = null;

/** GET — return latest snapshot + recent log */
export const GET: RequestHandler = async ({ url }) => {
	const tailLines = parseInt(url.searchParams.get('tail') || '50');

	let recentLog = '';
	try {
		const log = readFileSync(LOG_FILE, 'utf-8');
		const lines = log.trim().split('\n');
		recentLog = lines.slice(-tailLines).join('\n');
	} catch {
		recentLog = '(no log file yet)';
	}

	return new Response(
		JSON.stringify(
			{
				snapshot: lastSnapshot,
				recentLog
			},
			null,
			2
		),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};

/** POST — browser pushes state snapshot */
export const POST: RequestHandler = async ({ request }) => {
	lastSnapshot = await request.json();
	return new Response('ok');
};
