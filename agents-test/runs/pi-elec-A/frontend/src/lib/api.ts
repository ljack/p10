const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		headers: { 'Content-Type': 'application/json' },
		...options
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({ detail: res.statusText }));
		throw new Error(body.detail || `HTTP ${res.status}`);
	}
	return res.json();
}

// Devices
export const getDevices = (params?: Record<string, string>) => {
	const q = params ? '?' + new URLSearchParams(params).toString() : '';
	return request<any[]>(`/devices${q}`);
};
export const getDevice = (id: number) => request<any>(`/devices/${id}`);
export const createDevice = (data: any) =>
	request<any>('/devices', { method: 'POST', body: JSON.stringify(data) });
export const updateDevice = (id: number, data: any) =>
	request<any>(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDevice = (id: number) =>
	request<any>(`/devices/${id}`, { method: 'DELETE' });

// Consumption
export const getConsumption = (params?: Record<string, string>) => {
	const q = params ? '?' + new URLSearchParams(params).toString() : '';
	return request<any[]>(`/consumption${q}`);
};
export const getConsumptionStats = (params?: Record<string, string>) => {
	const q = params ? '?' + new URLSearchParams(params).toString() : '';
	return request<any>(`/consumption/stats${q}`);
};
export const createConsumption = (data: any) =>
	request<any>('/consumption', { method: 'POST', body: JSON.stringify(data) });

// Schedules
export const getSchedules = (params?: Record<string, string>) => {
	const q = params ? '?' + new URLSearchParams(params).toString() : '';
	return request<any[]>(`/schedules${q}`);
};
export const getTodaySchedules = () => request<any[]>('/schedules/today');
export const createSchedule = (data: any) =>
	request<any>('/schedules', { method: 'POST', body: JSON.stringify(data) });
export const updateSchedule = (id: number, data: any) =>
	request<any>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSchedule = (id: number) =>
	request<any>(`/schedules/${id}`, { method: 'DELETE' });

// Budget
export const getBudgets = () => request<any[]>('/budget');
export const getBudget = (ym: string) => request<any>(`/budget/${ym}`);
export const createBudget = (data: any) =>
	request<any>('/budget', { method: 'POST', body: JSON.stringify(data) });
export const updateBudget = (ym: string, data: any) =>
	request<any>(`/budget/${ym}`, { method: 'PUT', body: JSON.stringify(data) });
export const getBudgetStatus = (ym: string) => request<any>(`/budget/${ym}/status`);
