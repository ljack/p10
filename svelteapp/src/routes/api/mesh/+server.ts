import { readFileSync, existsSync } from 'fs';
import type { RequestHandler } from './$types';

const DISCOVERY_FILE = '/tmp/p10-master.json';

/**
 * Mesh discovery endpoint — returns Master Daemon connection info.
 * Browser Daemon uses this to find the Master.
 */
export const GET: RequestHandler = async () => {
	if (!existsSync(DISCOVERY_FILE)) {
		return new Response(
			JSON.stringify({ available: false, message: 'Master Daemon not running' }),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		const data = JSON.parse(readFileSync(DISCOVERY_FILE, 'utf-8'));
		return new Response(
			JSON.stringify({ available: true, ...data }),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch {
		return new Response(
			JSON.stringify({ available: false, message: 'Failed to read discovery file' }),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	}
};
