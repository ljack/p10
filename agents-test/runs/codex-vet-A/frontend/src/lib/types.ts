export type Species = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
export type AppointmentStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Pet {
  id: number;
  name: string;
  species: Species;
  breed: string | null;
  age_years: number;
  owner_name: string;
  owner_phone: string;
  notes: string | null;
}

export interface PetPayload {
  name: string;
  species: Species;
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

export interface TreatmentPayload {
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
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  pet: Pet;
  treatment: Treatment;
}

export interface AppointmentPayload {
  pet_id: number;
  treatment_id: number;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
}

export interface SlotWindow {
  start: string;
  end: string;
}

export interface AvailableSlots {
  date: string;
  treatment_id: number;
  duration_minutes: number;
  slots: SlotWindow[];
}
