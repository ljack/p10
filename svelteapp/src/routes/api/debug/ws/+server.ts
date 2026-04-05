import { addConnection, removeConnection } from '$lib/debug/sseConnections';
import type { RequestHandler } from './$types';

/**
 * Option B: Server-Sent Events for real-time debug streaming.
 * CLI usage: curl -N http://localhost:3333/api/debug/ws
 */
export const GET: RequestHandler = async () => {
	const stream = new ReadableStream({
		start(controller) {
			addConnection(controller);
			controller.enqueue(`data: [connected] P10 debug stream\n\n`);
		},
		cancel(controller) {
			removeConnection(controller as any);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
