import { readFileSync, existsSync } from 'fs';
import type { RequestHandler } from './$types';

const DISCOVERY_FILE = '/tmp/p10-master.json';

function getMasterUrl(): string | null {
	if (!existsSync(DISCOVERY_FILE)) return null;
	try {
		return JSON.parse(readFileSync(DISCOVERY_FILE, 'utf-8')).httpUrl;
	} catch {
		return null;
	}
}

/** GET /api/pipelines — proxy to Master's /pipelines endpoint */
export const GET: RequestHandler = async () => {
	const master = getMasterUrl();
	if (!master) {
		return new Response(
			JSON.stringify({ error: 'Master Daemon not running' }),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		const resp = await fetch(`${master}/pipelines`);
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
