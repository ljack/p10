const API_BASE = '/api';

export interface Device {
    id: number;
    name: string;
    type: string;
    wattage: number;
    location: string;
    is_active: boolean;
    created_at: string;
}

export interface ConsumptionLog {
    id: number;
    device_id: number;
    device_name: string;
    started_at: string;
    duration_minutes: number;
    kwh: number;
    recorded_at: string;
}

export interface Schedule {
    id: number;
    device_id: number;
    device_name?: string;
    device_type?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    enabled: boolean;
}

export interface Budget {
    id: number;
    year_month: string;
    budget_kwh: number;
    price_per_kwh: number;
    alert_threshold_percent: number;
    used_kwh?: number;
}

export interface BudgetStatus {
    budget_kwh: number;
    used_kwh: number;
    used_percent: number;
    remaining_kwh: number;
    projected_end_of_month_kwh: number;
    is_over_threshold: boolean;
    estimated_cost: number;
}

export interface Stats {
    total_kwh: number;
    total_cost: number;
    avg_daily_kwh: number;
    by_device: Array<{device_id: number; device_name: string; kwh: number; cost: number}>;
    by_type: Array<{type: string; kwh: number; cost: number}>;
}

async function request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }
    
    return response.json();
}

export const api = {
    devices: {
        list: (params?: { type?: string; location?: string }) => {
            const query = new URLSearchParams();
            if (params?.type) query.set('type', params.type);
            if (params?.location) query.set('location', params.location);
            return request(`/devices?${query}`) as Promise<Device[]>;
        },
        get: (id: number) => request(`/devices/${id}`),
        create: (data: Omit<Device, 'id' | 'is_active' | 'created_at'>) =>
            request('/devices', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: number, data: Partial<Omit<Device, 'id' | 'created_at'>>) =>
            request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: number) => request(`/devices/${id}`, { method: 'DELETE' }),
    },
    consumption: {
        list: (params?: { device_id?: number; from?: string; to?: string }) => {
            const query = new URLSearchParams();
            if (params?.device_id) query.set('device_id', String(params.device_id));
            if (params?.from) query.set('from', params.from);
            if (params?.to) query.set('to', params.to);
            return request(`/consumption?${query}`) as Promise<ConsumptionLog[]>;
        },
        create: (data: { device_id: number; started_at: string; duration_minutes: number }) =>
            request('/consumption', { method: 'POST', body: JSON.stringify(data) }),
        stats: (params?: { period?: string; device_id?: number; from?: string; to?: string }) => {
            const query = new URLSearchParams();
            if (params?.period) query.set('period', params.period);
            if (params?.device_id) query.set('device_id', String(params.device_id));
            if (params?.from) query.set('from', params.from);
            if (params?.to) query.set('to', params.to);
            return request(`/consumption/stats?${query}`) as Promise<Stats>;
        },
    },
    schedules: {
        list: (device_id?: number) => {
            const query = device_id ? `?device_id=${device_id}` : '';
            return request(`/schedules${query}`) as Promise<Schedule[]>;
        },
        today: () => request('/schedules/today') as Promise<Schedule[]>,
        create: (data: Omit<Schedule, 'id' | 'enabled' | 'device_name'>) =>
            request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: number, data: Partial<Omit<Schedule, 'id' | 'device_id'>>) =>
            request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: number) => request(`/schedules/${id}`, { method: 'DELETE' }),
    },
    budget: {
        list: () => request('/budget') as Promise<Budget[]>,
        get: (year_month: string) => request(`/budget/${year_month}`) as Promise<Budget>,
        create: (data: Omit<Budget, 'id'>) =>
            request('/budget', { method: 'POST', body: JSON.stringify(data) }),
        update: (year_month: string, data: Partial<Omit<Budget, 'id' | 'year_month'>>) =>
            request(`/budget/${year_month}`, { method: 'PUT', body: JSON.stringify(data) }),
        status: (year_month: string) => request(`/budget/${year_month}/status`) as Promise<BudgetStatus>,
    },
};
