type RequestOptions = RequestInit & {
	body?: unknown;
};

function isJsonResponse(response: Response): boolean {
	return response.headers.get('content-type')?.includes('application/json') ?? false;
}

function getErrorMessage(payload: unknown, fallback: string): string {
	if (payload && typeof payload === 'object' && 'detail' in payload) {
		const detail = (payload as { detail?: unknown }).detail;
		if (typeof detail === 'string') {
			return detail;
		}
	}
	return fallback;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const headers = new Headers(options.headers);
	const hasBody = options.body !== undefined;
	if (hasBody && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}

	const response = await fetch(path, {
		...options,
		headers,
		body: hasBody ? JSON.stringify(options.body) : undefined
	});

	if (!response.ok) {
		let payload: unknown = null;
		if (isJsonResponse(response)) {
			payload = await response.json();
		}
		throw new Error(getErrorMessage(payload, `Request failed with status ${response.status}`));
	}

	if (response.status === 204) {
		return undefined as T;
	}

	if (!isJsonResponse(response)) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

export const api = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
	put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
	delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
};
