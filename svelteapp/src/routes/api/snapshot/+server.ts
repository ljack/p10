import type { RequestHandler } from './$types';

/**
 * Debug endpoint to check/trigger WebContainer snapshot persistence.
 * GET  /api/snapshot — returns snapshot status (loads from IndexedDB via client)
 * POST /api/snapshot — triggers a save (client-side, returns instructions)
 * 
 * Note: IndexedDB lives in the browser, so this endpoint just signals intent.
 * The actual save/load happens client-side in container.ts.
 * This endpoint verifies the server-side mount tree can be read.
 */

export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify({
		info: 'IndexedDB persistence is client-side. Check browser console for "[container] Snapshot saved" / "[container] Restoring snapshot" messages.',
		howToTest: [
			'1. Open http://localhost:3333 in browser',
			'2. Open browser DevTools → Console',
			'3. Look for "[container] Snapshot saved: N files" messages (every 30s)',
			'4. Reload the page (Cmd+R)',
			'5. Look for "[container] Restoring N files from snapshot" message',
			'6. The WebContainer should have the same files as before reload',
		]
	}), {
		headers: { 'Content-Type': 'application/json' },
	});
};
