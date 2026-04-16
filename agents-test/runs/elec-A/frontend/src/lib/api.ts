export interface Device {
	id: number;
	name: string;
	type: string;
	wattage: number;
	location: string;
	is_active: boolean;
	created_at: string;
	recent_kwh?: number;
}

export interface ConsumptionLog {
	id: number;
	device_id: number;
	started_at: string;
	duration_minutes: number;
	kwh: number;
	recorded_at: string;
	device_name?: string;
}

export interface ConsumptionStats {
	total_kwh: number;
	total_cost: number;
	avg_daily_kwh: number;
	by_device: Array<{ device_id: number; device_name: string; total_kwh: number }>;
	by_type: Array<{ type: string; total_kwh: number }>;
}

export interface Schedule {
	id: number;
	device_id: number;
	day_of_week: number;
	start_time: string;
	end_time: string;
	enabled: boolean;
	device_name?: string;
}

export interface Budget {
	id: number;
	year_month: string;
	budget_kwh: number;
	price_per_kwh: number;
	alert_threshold_percent: number;
}

export interface BudgetStatus {
	budget_kwh: number;
	used_kwh: number;
	used_percent: number;
	remaining_kwh: number;
	projected_end_of_month_kwh: number;
	is_over_threshold: boolean;
	estimated_cost: number;
	price_per_kwh: number;
}

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${endpoint}`, {
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		},
		...options
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
		throw new Error(error.detail || `HTTP ${response.status}`);
	}

	if (response.status === 204) {
		return null as T;
	}

	return response.json();
}

// Device API
export const deviceAPI = {
	list: (params?: { type?: string; location?: string }) => {
		const query = new URLSearchParams(params as any).toString();
		return request<Device[]>(`/devices${query ? `?${query}` : ''}`);
	},
	get: (id: number) => request<Device>(`/devices/${id}`),
	create: (data: Omit<Device, 'id' | 'is_active' | 'created_at' | 'recent_kwh'>) =>
		request<Device>('/devices', {
			method: 'POST',
			body: JSON.stringify(data)
		}),
	update: (id: number, data: Partial<Device>) =>
		request<Device>(`/devices/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data)
		}),
	delete: (id: number) =>
		request<void>(`/devices/${id}`, {
			method: 'DELETE'
		})
};

// Consumption API
export const consumptionAPI = {
	list: (params?: { device_id?: number; from_date?: string; to_date?: string }) => {
		const query = new URLSearchParams(params as any).toString();
		return request<ConsumptionLog[]>(`/consumption${query ? `?${query}` : ''}`);
	},
	create: (data: { device_id: number; started_at: string; duration_minutes: number }) =>
		request<ConsumptionLog>('/consumption', {
			method: 'POST',
			body: JSON.stringify(data)
		}),
	stats: (params?: {
		period?: string;
		device_id?: number;
		from_date?: string;
		to_date?: string;
	}) => {
		const query = new URLSearchParams(params as any).toString();
		return request<ConsumptionStats>(`/consumption/stats${query ? `?${query}` : ''}`);
	}
};

// Schedule API
export const scheduleAPI = {
	list: (params?: { device_id?: number }) => {
		const query = new URLSearchParams(params as any).toString();
		return request<Schedule[]>(`/schedules${query ? `?${query}` : ''}`);
	},
	today: () => request<Schedule[]>('/schedules/today'),
	create: (data: Omit<Schedule, 'id' | 'device_name'>) =>
		request<Schedule>('/schedules', {
			method: 'POST',
			body: JSON.stringify(data)
		}),
	update: (id: number, data: Partial<Schedule>) =>
		request<Schedule>(`/schedules/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data)
		}),
	delete: (id: number) =>
		request<void>(`/schedules/${id}`, {
			method: 'DELETE'
		})
};

// Budget API
export const budgetAPI = {
	list: () => request<Budget[]>('/budget'),
	get: (yearMonth: string) => request<Budget>(`/budget/${yearMonth}`),
	status: (yearMonth: string) => request<BudgetStatus>(`/budget/${yearMonth}/status`),
	create: (data: Omit<Budget, 'id'>) =>
		request<Budget>('/budget', {
			method: 'POST',
			body: JSON.stringify(data)
		}),
	update: (yearMonth: string, data: Partial<Budget>) =>
		request<Budget>(`/budget/${yearMonth}`, {
			method: 'PUT',
			body: JSON.stringify(data)
		})
};
