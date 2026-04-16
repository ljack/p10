const API_BASE = '/api';

async function request(endpoint: string, options: RequestInit = {}) {
	const response = await fetch(`${API_BASE}${endpoint}`, {
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
		...options,
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Request failed' }));
		throw new Error(error.detail || 'Request failed');
	}

	return response.json();
}

// Devices
export const devices = {
	list: (params?: { type?: string; location?: string }) => {
		const query = new URLSearchParams(params as any).toString();
		return request(`/devices${query ? `?${query}` : ''}`);
	},
	create: (data: any) => request('/devices', { method: 'POST', body: JSON.stringify(data) }),
	get: (id: number) => request(`/devices/${id}`),
	update: (id: number, data: any) => request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
	delete: (id: number) => request(`/devices/${id}`, { method: 'DELETE' }),
};

// Consumption
export const consumption = {
	list: (params?: { device_id?: number; from_date?: string; to_date?: string }) => {
		const query = new URLSearchParams(params as any).toString();
		return request(`/consumption${query ? `?${query}` : ''}`);
	},
	create: (data: any) => request('/consumption', { method: 'POST', body: JSON.stringify(data) }),
	stats: (params?: { period?: string; device_id?: number; from_date?: string; to_date?: string }) => {
		const query = new URLSearchParams(params as any).toString();
		return request(`/consumption/stats${query ? `?${query}` : ''}`);
	},
};

// Schedules
export const schedules = {
	list: (device_id?: number) => {
		const query = device_id ? `?device_id=${device_id}` : '';
		return request(`/schedules${query}`);
	},
	create: (data: any) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
	update: (id: number, data: any) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
	delete: (id: number) => request(`/schedules/${id}`, { method: 'DELETE' }),
	today: () => request('/schedules/today'),
};

// Budget
export const budget = {
	list: () => request('/budget'),
	create: (data: any) => request('/budget', { method: 'POST', body: JSON.stringify(data) }),
	get: (yearMonth: string) => request(`/budget/${yearMonth}`),
	update: (yearMonth: string, data: any) => request(`/budget/${yearMonth}`, { method: 'PUT', body: JSON.stringify(data) }),
	status: (yearMonth: string) => request(`/budget/${yearMonth}/status`),
};
