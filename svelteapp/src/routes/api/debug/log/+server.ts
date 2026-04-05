import { appendFileSync } from 'fs';
import { broadcast } from '$lib/debug/sseConnections';
import type { RequestHandler } from './$types';

const LOG_FILE = '/tmp/p10-debug.log';

/** Option A: Append debug events to log file + broadcast via SSE */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const event = await request.json();
		const line = `[${event.timestamp}] [${event.level}] [${event.source}] ${event.event}${event.data ? ' | ' + event.data : ''}`;
		appendFileSync(LOG_FILE, line + '\n');
		broadcast(line);
	} catch {
		// Never fail on debug logging
	}
	return new Response('ok');
};
