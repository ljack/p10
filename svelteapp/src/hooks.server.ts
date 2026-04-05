import type { Handle } from '@sveltejs/kit';

/**
 * WebContainers require Cross-Origin Isolation headers.
 * These enable SharedArrayBuffer which WebContainers depend on.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

	return response;
};
