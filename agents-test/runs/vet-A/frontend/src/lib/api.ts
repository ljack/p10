const API_BASE = 'http://localhost:8000/api';

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
    price: string;
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

export interface AvailableSlot {
    start_time: string;
    end_time: string;
}

// Pets API
export async function getPets(ownerName?: string): Promise<Pet[]> {
    const params = ownerName ? `?owner_name=${encodeURIComponent(ownerName)}` : '';
    const response = await fetch(`${API_BASE}/pets${params}`);
    if (!response.ok) throw new Error('Failed to fetch pets');
    return response.json();
}

export async function getPet(id: number): Promise<Pet> {
    const response = await fetch(`${API_BASE}/pets/${id}`);
    if (!response.ok) throw new Error('Failed to fetch pet');
    return response.json();
}

export async function createPet(pet: Omit<Pet, 'id'>): Promise<Pet> {
    const response = await fetch(`${API_BASE}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pet)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create pet');
    }
    return response.json();
}

export async function updatePet(id: number, pet: Omit<Pet, 'id'>): Promise<Pet> {
    const response = await fetch(`${API_BASE}/pets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pet)
    });
    if (!response.ok) throw new Error('Failed to update pet');
    return response.json();
}

export async function deletePet(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/pets/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete pet');
}

// Treatments API
export async function getTreatments(): Promise<Treatment[]> {
    const response = await fetch(`${API_BASE}/treatments`);
    if (!response.ok) throw new Error('Failed to fetch treatments');
    return response.json();
}

export async function createTreatment(treatment: Omit<Treatment, 'id'>): Promise<Treatment> {
    const response = await fetch(`${API_BASE}/treatments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(treatment)
    });
    if (!response.ok) throw new Error('Failed to create treatment');
    return response.json();
}

export async function updateTreatment(id: number, treatment: Omit<Treatment, 'id'>): Promise<Treatment> {
    const response = await fetch(`${API_BASE}/treatments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(treatment)
    });
    if (!response.ok) throw new Error('Failed to update treatment');
    return response.json();
}

export async function deleteTreatment(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/treatments/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete treatment');
}

// Appointments API
export async function getAppointments(filters?: {
    date?: string;
    pet_id?: number;
    status?: string;
}): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.pet_id) params.append('pet_id', filters.pet_id.toString());
    if (filters?.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    const response = await fetch(`${API_BASE}/appointments${queryString ? '?' + queryString : ''}`);
    if (!response.ok) throw new Error('Failed to fetch appointments');
    return response.json();
}

export async function getAppointment(id: number): Promise<Appointment> {
    const response = await fetch(`${API_BASE}/appointments/${id}`);
    if (!response.ok) throw new Error('Failed to fetch appointment');
    return response.json();
}

export async function createAppointment(appointment: {
    pet_id: number;
    treatment_id: number;
    scheduled_at: string;
    status?: string;
    notes?: string;
}): Promise<Appointment> {
    const response = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create appointment');
    }
    return response.json();
}

export async function updateAppointment(id: number, update: {
    scheduled_at?: string;
    status?: string;
    notes?: string;
}): Promise<Appointment> {
    const response = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update appointment');
    }
    return response.json();
}

export async function deleteAppointment(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to cancel appointment');
}

export async function getAvailableSlots(date: string, treatmentId: number): Promise<AvailableSlot[]> {
    const response = await fetch(`${API_BASE}/appointments/available-slots?date=${date}&treatment_id=${treatmentId}`);
    if (!response.ok) throw new Error('Failed to fetch available slots');
    return response.json();
}
