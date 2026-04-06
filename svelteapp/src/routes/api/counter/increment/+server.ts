import type { RequestHandler } from './$types';
import { state } from '../state';

/** POST /api/counter/increment — increments count by 1 and returns updated count */
export const POST: RequestHandler = async () => {
	state.count += 1;
	return new Response(JSON.stringify({ count: state.count }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
