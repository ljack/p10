import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/project/new
 * Create a new project - resets WebContainer and clears project tasks via Master Daemon
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Proxy to Master Daemon's project/new endpoint
		const masterUrl = 'http://localhost:7777/project/new';
		
		const response = await fetch(masterUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({})
		});

		if (!response.ok) {
			return json(
				{ error: `Master daemon error: ${response.statusText}` },
				{ status: response.status }
			);
		}

		const data = await response.json();
		
		// Also reset the WebContainer locally
		try {
			const { resetContainer } = await import('$lib/sandbox/container');
			await resetContainer();
			
			return json({
				...data,
				containerReset: true,
				message: 'Project reset complete - WebContainer and mesh state cleared'
			});
		} catch (containerErr) {
			// Master reset worked, but container reset failed
			return json({
				...data,
				containerReset: false,
				warning: `Master reset OK, but WebContainer reset failed: ${containerErr}`
			});
		}

	} catch (error) {
		return json(
			{ 
				error: 'Failed to create new project',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};