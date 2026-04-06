import type { RequestHandler } from './$types';
import { state } from './state';

/** GET /api/counter — returns current count */
export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify({ count: state.count }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
