import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const BACKEND_URL = env.PRIVATE_BACKEND_URL ?? env.BACKEND_URL ?? 'http://127.0.0.1:8000';
const HOP_BY_HOP_HEADERS = new Set([
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'host'
]);

const proxy: RequestHandler = async ({ params, request, url, fetch }) => {
	const target = new URL(`${BACKEND_URL}/api/${params.path}`);
	target.search = url.search;

	const headers = new Headers(request.headers);
	for (const header of HOP_BY_HOP_HEADERS) {
		headers.delete(header);
	}

	const method = request.method.toUpperCase();
	const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
	const response = await fetch(target, {
		method,
		headers,
		body,
		redirect: 'manual'
	});

	const responseHeaders = new Headers(response.headers);
	for (const header of HOP_BY_HOP_HEADERS) {
		responseHeaders.delete(header);
	}

	return new Response(response.body, {
		status: response.status,
		headers: responseHeaders
	});
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;
