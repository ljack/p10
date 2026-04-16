/**
 * API client for vet clinic backend
 */

export interface Pet {
	id?: number;
	name: string;
	species: string;
	breed?: string;
	age_years: number;
	owner_name: string;
	owner_phone: string;
	notes?: string;
}

export interface Treatment {
	id?: number;
	name: string;
	duration_minutes: number;
	description?: string;
	price: number;
}

export interface Appointment {
	id?: number;
	pet_id: number;
	treatment_id: number;
	scheduled_at: string;
	status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
	notes?: string;
	created_at?: string;
}

export interface AvailableSlot {
	time: string;
	datetime: string;
}

async function fetchJSON(url: string, options?: RequestInit) {
	const response = await fetch(url, options);
	if (!response.ok) {
		throw new Error(`API Error: ${response.statusText}`);
	}
	return response.json();
}

export const api = {
	pets: {
		getAll: async (ownerName?: string): Promise<Pet[]> => {
			const url = ownerName ? `/api/pets?owner_name=${encodeURIComponent(ownerName)}` : '/api/pets';
			return fetchJSON(url);
		},
		getById: async (id: number): Promise<Pet> => {
			return fetchJSON(`/api/pets/${id}`);
		},
		create: async (pet: Omit<Pet, 'id'>): Promise<Pet> => {
			return fetchJSON('/api/pets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pet)
			});
		},
		update: async (id: number, pet: Omit<Pet, 'id'>): Promise<Pet> => {
			return fetchJSON(`/api/pets/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pet)
			});
		},
		delete: async (id: number): Promise<void> => {
			await fetch(`/api/pets/${id}`, { method: 'DELETE' });
		}
	},
	
	treatments: {
		getAll: async (): Promise<Treatment[]> => {
			return fetchJSON('/api/treatments');
		},
		create: async (treatment: Omit<Treatment, 'id'>): Promise<Treatment> => {
			return fetchJSON('/api/treatments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(treatment)
			});
		},
		update: async (id: number, treatment: Omit<Treatment, 'id'>): Promise<Treatment> => {
			return fetchJSON(`/api/treatments/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(treatment)
			});
		},
		delete: async (id: number): Promise<void> => {
			await fetch(`/api/treatments/${id}`, { method: 'DELETE' });
		}
	},
	
	appointments: {
		getAll: async (filters?: { date?: string; pet_id?: number; status?: string }): Promise<Appointment[]> => {
			const params = new URLSearchParams();
			if (filters?.date) params.append('date', filters.date);
			if (filters?.pet_id) params.append('pet_id', filters.pet_id.toString());
			if (filters?.status) params.append('status', filters.status);
			
			const url = params.toString() ? `/api/appointments?${params}` : '/api/appointments';
			return fetchJSON(url);
		},
		getById: async (id: number): Promise<Appointment> => {
			return fetchJSON(`/api/appointments/${id}`);
		},
		create: async (appointment: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment> => {
			return fetchJSON('/api/appointments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(appointment)
			});
		},
		update: async (id: number, appointment: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment> => {
			return fetchJSON(`/api/appointments/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(appointment)
			});
		},
		delete: async (id: number): Promise<void> => {
			await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
		},
		getAvailableSlots: async (date: string, treatmentId: number): Promise<AvailableSlot[]> => {
			return fetchJSON(`/api/appointments/available-slots?date=${date}&treatment_id=${treatmentId}`);
		}
	}
};
