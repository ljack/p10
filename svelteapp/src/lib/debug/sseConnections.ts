/** Shared SSE connection pool for debug streaming */

const connections = new Set<ReadableStreamDefaultController>();

export function addConnection(controller: ReadableStreamDefaultController) {
	connections.add(controller);
}

export function removeConnection(controller: ReadableStreamDefaultController) {
	connections.delete(controller);
}

export function broadcast(line: string) {
	connections.forEach((controller) => {
		try {
			controller.enqueue(`data: ${line}\n\n`);
		} catch {
			connections.delete(controller);
		}
	});
}
