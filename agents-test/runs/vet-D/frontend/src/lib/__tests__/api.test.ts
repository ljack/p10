import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Pets', () => {
		it('should fetch all pets', async () => {
			const mockPets = [
				{ id: 1, name: 'Buddy', species: 'dog', age_years: 3, owner_name: 'John', owner_phone: '555-1234' }
			];
			
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockPets
			});

			const pets = await api.pets.getAll();
			
			expect(global.fetch).toHaveBeenCalledWith('/api/pets', undefined);
			expect(pets).toEqual(mockPets);
		});

		it('should create a pet', async () => {
			const newPet = { name: 'Buddy', species: 'dog', age_years: 3, owner_name: 'John', owner_phone: '555-1234' };
			const mockResponse = { id: 1, ...newPet };
			
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const pet = await api.pets.create(newPet);
			
			expect(global.fetch).toHaveBeenCalledWith('/api/pets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newPet)
			});
			expect(pet).toEqual(mockResponse);
		});
	});

	describe('Treatments', () => {
		it('should fetch all treatments', async () => {
			const mockTreatments = [
				{ id: 1, name: 'Vaccination', duration_minutes: 30, price: 75.00 }
			];
			
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockTreatments
			});

			const treatments = await api.treatments.getAll();
			
			expect(global.fetch).toHaveBeenCalledWith('/api/treatments', undefined);
			expect(treatments).toEqual(mockTreatments);
		});
	});

	describe('Appointments', () => {
		it('should fetch available slots', async () => {
			const mockSlots = [
				{ time: '09:00', datetime: '2024-01-15T09:00:00' }
			];
			
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockSlots
			});

			const slots = await api.appointments.getAvailableSlots('2024-01-15', 1);
			
			expect(global.fetch).toHaveBeenCalledWith('/api/appointments/available-slots?date=2024-01-15&treatment_id=1', undefined);
			expect(slots).toEqual(mockSlots);
		});

		it('should book an appointment', async () => {
			const newAppt = {
				pet_id: 1,
				treatment_id: 1,
				scheduled_at: '2024-01-15T09:00:00',
				status: 'scheduled'
			};
			const mockResponse = { id: 1, ...newAppt, created_at: '2024-01-14T10:00:00' };
			
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const appt = await api.appointments.create(newAppt);
			
			expect(global.fetch).toHaveBeenCalledWith('/api/appointments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newAppt)
			});
			expect(appt).toEqual(mockResponse);
		});
	});
});
