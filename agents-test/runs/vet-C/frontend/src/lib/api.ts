export interface Pet {
	id: number;
	name: string;
	species: string;
	breed?: string;
	age_years: number;
	owner_name: string;
	owner_phone: string;
	notes?: string;
}

export interface Treatment {
	id: number;
	name: string;
	duration_minutes: number;
	description?: string;
	price: number;
}

export interface Appointment {
	id: number;
	pet_id: number;
	treatment_id: number;
	scheduled_at: string;
	status: string;
	notes?: string;
	created_at: string;
	pet: Pet;
	treatment: Treatment;
}

export interface TimeSlot {
	start_time: string;
	end_time: string;
}

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
		throw new Error(error.detail || `HTTP ${response.status}`);
	}
	return response.json();
}

// Pets API
export async function getPets(ownerName?: string): Promise<Pet[]> {
	const url = ownerName ? `${API_BASE}/pets?owner_name=${encodeURIComponent(ownerName)}` : `${API_BASE}/pets`;
	const response = await fetch(url);
	return handleResponse<Pet[]>(response);
}

export async function getPet(id: number): Promise<Pet> {
	const response = await fetch(`${API_BASE}/pets/${id}`);
	return handleResponse<Pet>(response);
}

export async function createPet(pet: Omit<Pet, 'id'>): Promise<Pet> {
	const response = await fetch(`${API_BASE}/pets`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(pet)
	});
	return handleResponse<Pet>(response);
}

export async function updatePet(id: number, pet: Partial<Omit<Pet, 'id'>>): Promise<Pet> {
	const response = await fetch(`${API_BASE}/pets/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(pet)
	});
	return handleResponse<Pet>(response);
}

export async function deletePet(id: number): Promise<void> {
	const response = await fetch(`${API_BASE}/pets/${id}`, {
		method: 'DELETE'
	});
	await handleResponse(response);
}

// Treatments API
export async function getTreatments(): Promise<Treatment[]> {
	const response = await fetch(`${API_BASE}/treatments`);
	return handleResponse<Treatment[]>(response);
}

export async function createTreatment(treatment: Omit<Treatment, 'id'>): Promise<Treatment> {
	const response = await fetch(`${API_BASE}/treatments`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(treatment)
	});
	return handleResponse<Treatment>(response);
}

export async function updateTreatment(id: number, treatment: Partial<Omit<Treatment, 'id'>>): Promise<Treatment> {
	const response = await fetch(`${API_BASE}/treatments/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(treatment)
	});
	return handleResponse<Treatment>(response);
}

export async function deleteTreatment(id: number): Promise<void> {
	const response = await fetch(`${API_BASE}/treatments/${id}`, {
		method: 'DELETE'
	});
	await handleResponse(response);
}

// Appointments API
export async function getAppointments(params?: {
	date?: string;
	pet_id?: number;
	status?: string;
}): Promise<Appointment[]> {
	const searchParams = new URLSearchParams();
	if (params?.date) searchParams.set('date', params.date);
	if (params?.pet_id) searchParams.set('pet_id', params.pet_id.toString());
	if (params?.status) searchParams.set('status', params.status);
	
	const url = `${API_BASE}/appointments${searchParams.toString() ? '?' + searchParams : ''}`;
	const response = await fetch(url);
	return handleResponse<Appointment[]>(response);
}

export async function getAppointment(id: number): Promise<Appointment> {
	const response = await fetch(`${API_BASE}/appointments/${id}`);
	return handleResponse<Appointment>(response);
}

export async function createAppointment(appointment: {
	pet_id: number;
	treatment_id: number;
	scheduled_at: string;
	notes?: string;
}): Promise<Appointment> {
	const response = await fetch(`${API_BASE}/appointments`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(appointment)
	});
	return handleResponse<Appointment>(response);
}

export async function updateAppointment(id: number, appointment: {
	scheduled_at?: string;
	status?: string;
	notes?: string;
}): Promise<Appointment> {
	const response = await fetch(`${API_BASE}/appointments/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(appointment)
	});
	return handleResponse<Appointment>(response);
}

export async function deleteAppointment(id: number): Promise<void> {
	const response = await fetch(`${API_BASE}/appointments/${id}`, {
		method: 'DELETE'
	});
	await handleResponse(response);
}

export async function getAvailableSlots(date: string, treatmentId: number): Promise<TimeSlot[]> {
	const response = await fetch(`${API_BASE}/appointments/available-slots?date=${date}&treatment_id=${treatmentId}`);
	return handleResponse<TimeSlot[]>(response);
}
