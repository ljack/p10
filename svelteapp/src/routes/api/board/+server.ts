import { readFileSync, existsSync } from 'fs';
import type { RequestHandler } from './$types';

const DISCOVERY_FILE = '/tmp/p10-master.json';

function getMasterUrl(): string | null {
	if (!existsSync(DISCOVERY_FILE)) return null;
	try {
		const data = JSON.parse(readFileSync(DISCOVERY_FILE, 'utf-8'));
		return data.httpUrl;
	} catch {
		return null;
	}
}

/** GET /api/board — proxy to Master's /board endpoint */
export const GET: RequestHandler = async () => {
	const master = getMasterUrl();
	if (!master) {
		return new Response(
			JSON.stringify({ error: 'Master Daemon not running' }),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		const resp = await fetch(`${master}/board`);
		const data = await resp.json();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: any) {
		return new Response(
			JSON.stringify({ error: err.message }),
			{ status: 502, headers: { 'Content-Type': 'application/json' } }
		);
	}
};

/** POST /api/board — add a task to the board */
export const POST: RequestHandler = async ({ request }) => {
	const master = getMasterUrl();
	if (!master) {
		return new Response(
			JSON.stringify({ error: 'Master Daemon not running' }),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		const body = await request.json();
		const resp = await fetch(`${master}/board/task`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		const data = await resp.json();
		return new Response(JSON.stringify(data), {
			status: resp.status,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: any) {
		return new Response(
			JSON.stringify({ error: err.message }),
			{ status: 502, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
