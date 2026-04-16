import type {
  Appointment,
  AppointmentPayload,
  AvailableSlots,
  Pet,
  PetPayload,
  Treatment,
  TreatmentPayload
} from '$lib/types';

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.set(key, `${value}`);
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof payload === 'string'
        ? payload
        : payload?.detail || payload?.message || 'Something went wrong while talking to the API.';
    throw new Error(detail);
  }

  return payload as T;
}

export const api = {
  listPets(ownerName?: string) {
    return request<Pet[]>(`/api/pets${buildQuery({ owner_name: ownerName })}`);
  },
  getPet(id: number) {
    return request<Pet>(`/api/pets/${id}`);
  },
  createPet(payload: PetPayload) {
    return request<Pet>('/api/pets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updatePet(id: number, payload: PetPayload) {
    return request<Pet>(`/api/pets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deletePet(id: number) {
    return request<void>(`/api/pets/${id}`, {
      method: 'DELETE'
    });
  },
  listTreatments() {
    return request<Treatment[]>('/api/treatments');
  },
  createTreatment(payload: TreatmentPayload) {
    return request<Treatment>('/api/treatments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateTreatment(id: number, payload: TreatmentPayload) {
    return request<Treatment>(`/api/treatments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteTreatment(id: number) {
    return request<void>(`/api/treatments/${id}`, {
      method: 'DELETE'
    });
  },
  listAppointments(filters?: { date?: string; pet_id?: number; status?: string }) {
    return request<Appointment[]>(
      `/api/appointments${buildQuery({
        date: filters?.date,
        pet_id: filters?.pet_id,
        status: filters?.status
      })}`
    );
  },
  getAppointment(id: number) {
    return request<Appointment>(`/api/appointments/${id}`);
  },
  createAppointment(payload: AppointmentPayload) {
    return request<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateAppointment(id: number, payload: AppointmentPayload) {
    return request<Appointment>(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  cancelAppointment(id: number) {
    return request<void>(`/api/appointments/${id}`, {
      method: 'DELETE'
    });
  },
  availableSlots(date: string, treatmentId: number) {
    return request<AvailableSlots>(
      `/api/appointments/available-slots${buildQuery({
        date,
        treatment_id: treatmentId
      })}`
    );
  }
};
