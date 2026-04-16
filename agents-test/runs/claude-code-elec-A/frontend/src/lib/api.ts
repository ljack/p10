import type { Device, ConsumptionLog, ConsumptionStats, Schedule, Budget, BudgetStatus } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// ---- Devices ----

export async function fetchDevices(filters?: { type?: string; location?: string; is_active?: boolean }): Promise<Device[]> {
  return request<Device[]>(`/api/devices${qs(filters ?? {})}`);
}

export async function getDevice(id: number): Promise<Device> {
  return request<Device>(`/api/devices/${id}`);
}

export async function createDevice(data: Omit<Device, 'id' | 'is_active' | 'created_at'>): Promise<Device> {
  return request<Device>('/api/devices', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateDevice(id: number, data: Partial<Device>): Promise<Device> {
  return request<Device>(`/api/devices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteDevice(id: number): Promise<void> {
  await fetch(`/api/devices/${id}`, { method: 'DELETE' });
}

// ---- Consumption ----

export async function logConsumption(data: { device_id: number; started_at: string; duration_minutes: number }): Promise<ConsumptionLog> {
  return request<ConsumptionLog>('/api/consumption', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function fetchConsumption(filters?: { device_id?: number; from?: string; to?: string }): Promise<ConsumptionLog[]> {
  return request<ConsumptionLog[]>(`/api/consumption${qs(filters ?? {})}`);
}

export async function fetchConsumptionStats(params?: { from?: string; to?: string }): Promise<ConsumptionStats> {
  return request<ConsumptionStats>(`/api/consumption/stats${qs(params ?? {})}`);
}

// ---- Schedules ----

export async function fetchSchedules(deviceId?: number): Promise<Schedule[]> {
  const q = deviceId ? qs({ device_id: deviceId }) : '';
  return request<Schedule[]>(`/api/schedules${q}`);
}

export async function createSchedule(data: Omit<Schedule, 'id' | 'device_name' | 'device_wattage'>): Promise<Schedule> {
  return request<Schedule>('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateSchedule(id: number, data: Partial<Schedule>): Promise<Schedule> {
  return request<Schedule>(`/api/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteSchedule(id: number): Promise<void> {
  await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
}

export async function fetchTodaySchedules(): Promise<Schedule[]> {
  return request<Schedule[]>('/api/schedules/today');
}

// ---- Budget ----

export async function fetchBudgets(): Promise<Budget[]> {
  return request<Budget[]>('/api/budgets');
}

export async function createBudget(data: Omit<Budget, 'id'>): Promise<Budget> {
  return request<Budget>('/api/budgets', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function getBudget(yearMonth: string): Promise<Budget> {
  return request<Budget>(`/api/budgets/${yearMonth}`);
}

export async function updateBudget(yearMonth: string, data: Partial<Budget>): Promise<Budget> {
  return request<Budget>(`/api/budgets/${yearMonth}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function getBudgetStatus(yearMonth: string): Promise<BudgetStatus> {
  return request<BudgetStatus>(`/api/budgets/${yearMonth}/status`);
}
