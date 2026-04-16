/**
 * API utility functions
 */

const API_BASE = '/api/v1';

export interface Device {
	id: number;
	name: string;
	type: string;
	wattage: number;
	location: string;
	is_active: boolean;
	created_at: string;
}

export async function fetchDevices(): Promise<Device[]> {
	const response = await fetch(`${API_BASE}/devices`);
	if (!response.ok) throw new Error('Failed to fetch devices');
	return response.json();
}

export async function fetchDevice(id: number): Promise<Device> {
	const response = await fetch(`${API_BASE}/devices/${id}`);
	if (!response.ok) throw new Error('Failed to fetch device');
	return response.json();
}

export async function createDevice(device: Omit<Device, 'id' | 'is_active' | 'created_at'>): Promise<Device> {
	const response = await fetch(`${API_BASE}/devices`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(device)
	});
	if (!response.ok) throw new Error('Failed to create device');
	return response.json();
}

export async function updateDevice(id: number, device: Partial<Device>): Promise<Device> {
	const response = await fetch(`${API_BASE}/devices/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(device)
	});
	if (!response.ok) throw new Error('Failed to update device');
	return response.json();
}

export async function deleteDevice(id: number): Promise<void> {
	const response = await fetch(`${API_BASE}/devices/${id}`, {
		method: 'DELETE'
	});
	if (!response.ok) throw new Error('Failed to delete device');
}
