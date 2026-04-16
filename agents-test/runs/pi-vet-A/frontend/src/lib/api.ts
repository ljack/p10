const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE}${url}`, {
		headers: { 'Content-Type': 'application/json' },
		...options
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: res.statusText }));
		throw new Error(err.detail || 'Request failed');
	}
	if (res.status === 204) return undefined as T;
	return res.json();
}

// Types
export interface Pet {
	id: number;
	name: string;
	species: string;
	breed: string | null;
	age_years: number;
	owner_name: string;
	owner_phone: string;
	notes: string | null;
}

export interface Treatment {
	id: number;
	name: string;
	duration_minutes: number;
	description: string | null;
	price: number;
}

export interface Appointment {
	id: number;
	pet_id: number;
	treatment_id: number;
	scheduled_at: string;
	status: string;
	notes: string | null;
	created_at: string;
	pet_name?: string;
	treatment_name?: string;
	treatment_duration?: number;
	treatment_price?: number;
}

export interface AvailableSlot {
	start: string;
	end: string;
}

// Pets
export const getPets = (ownerName?: string) =>
	request<Pet[]>(`/pets${ownerName ? `?owner_name=${encodeURIComponent(ownerName)}` : ''}`);
export const getPet = (id: number) => request<Pet>(`/pets/${id}`);
export const createPet = (data: Omit<Pet, 'id'>) =>
	request<Pet>('/pets', { method: 'POST', body: JSON.stringify(data) });
export const updatePet = (id: number, data: Partial<Pet>) =>
	request<Pet>(`/pets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePet = (id: number) =>
	request<void>(`/pets/${id}`, { method: 'DELETE' });

// Treatments
export const getTreatments = () => request<Treatment[]>('/treatments');
export const createTreatment = (data: Omit<Treatment, 'id'>) =>
	request<Treatment>('/treatments', { method: 'POST', body: JSON.stringify(data) });
export const updateTreatment = (id: number, data: Partial<Treatment>) =>
	request<Treatment>(`/treatments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTreatment = (id: number) =>
	request<void>(`/treatments/${id}`, { method: 'DELETE' });

// Appointments
export const getAppointments = (params?: { date?: string; pet_id?: number; status?: string }) => {
	const q = new URLSearchParams();
	if (params?.date) q.set('date', params.date);
	if (params?.pet_id) q.set('pet_id', String(params.pet_id));
	if (params?.status) q.set('status', params.status);
	const qs = q.toString();
	return request<Appointment[]>(`/appointments${qs ? `?${qs}` : ''}`);
};
export const getAppointment = (id: number) => request<Appointment>(`/appointments/${id}`);
export const createAppointment = (data: {
	pet_id: number;
	treatment_id: number;
	scheduled_at: string;
	notes?: string;
}) => request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) });
export const updateAppointment = (id: number, data: Partial<Appointment>) =>
	request<Appointment>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAppointment = (id: number) =>
	request<void>(`/appointments/${id}`, { method: 'DELETE' });
export const getAvailableSlots = (date: string, treatmentId: number) =>
	request<AvailableSlot[]>(`/appointments/available-slots?date=${date}&treatment_id=${treatmentId}`);
