<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api, type Pet, type Treatment, type AvailableSlot } from '$lib/api';
	
	let step = $state(1);
	let pets = $state<Pet[]>([]);
	let treatments = $state<Treatment[]>([]);
	let availableSlots = $state<AvailableSlot[]>([]);
	
	let selectedPetId = $state<number | null>(null);
	let selectedTreatmentId = $state<number | null>(null);
	let selectedDate = $state('');
	let selectedSlot = $state<AvailableSlot | null>(null);
	let notes = $state('');
	let loading = $state(false);
	
	onMount(async () => {
		try {
			pets = await api.pets.getAll();
			treatments = await api.treatments.getAll();
		} catch (error) {
			console.error('Failed to load data:', error);
		}
	});
	
	async function loadAvailableSlots() {
		if (!selectedDate || !selectedTreatmentId) return;
		
		loading = true;
		try {
			availableSlots = await api.appointments.getAvailableSlots(selectedDate, selectedTreatmentId);
		} catch (error) {
			console.error('Failed to load slots:', error);
			availableSlots = [];
		} finally {
			loading = false;
		}
	}
	
	function nextStep() {
		if (step === 1 && selectedPetId) {
			step = 2;
		} else if (step === 2 && selectedTreatmentId) {
			step = 3;
		} else if (step === 3 && selectedSlot) {
			step = 4;
		}
	}
	
	function prevStep() {
		if (step > 1) step--;
	}
	
	async function bookAppointment() {
		if (!selectedPetId || !selectedTreatmentId || !selectedSlot) return;
		
		loading = true;
		try {
			await api.appointments.create({
				pet_id: selectedPetId,
				treatment_id: selectedTreatmentId,
				scheduled_at: selectedSlot.datetime,
				status: 'scheduled',
				notes: notes || undefined
			});
			
			alert('Appointment booked successfully!');
			goto('/appointments');
		} catch (error: any) {
			console.error('Failed to book appointment:', error);
			alert(`Failed to book appointment: ${error.message || 'Unknown error'}`);
		} finally {
			loading = false;
		}
	}
	
	$effect(() => {
		if (selectedDate && selectedTreatmentId) {
			loadAvailableSlots();
		}
	});
</script>

<svelte:head>
	<title>Book Appointment - Vet Clinic</title>
</svelte:head>

<h1>Book Appointment</h1>

<div class="steps">
	<div class="step" class:active={step === 1} class:completed={step > 1}>1. Select Pet</div>
	<div class="step" class:active={step === 2} class:completed={step > 2}>2. Select Treatment</div>
	<div class="step" class:active={step === 3} class:completed={step > 3}>3. Pick Time Slot</div>
	<div class="step" class:active={step === 4}>4. Confirm</div>
</div>

{#if step === 1}
	<div class="card">
		<h2>Select a Pet</h2>
		{#if pets.length === 0}
			<p>No pets found. <a href="/pets">Add a pet first</a></p>
		{:else}
			<div class="selection-grid">
				{#each pets as pet}
					<div
						class="selection-card"
						class:selected={selectedPetId === pet.id}
						onclick={() => selectedPetId = pet.id!}
					>
						<h3>{pet.name}</h3>
						<p>{pet.species} • {pet.age_years} years</p>
						<p class="owner">{pet.owner_name}</p>
					</div>
				{/each}
			</div>
			<div class="actions">
				<button class="btn btn-primary" onclick={nextStep} disabled={!selectedPetId}>
					Next
				</button>
			</div>
		{/if}
	</div>
{:else if step === 2}
	<div class="card">
		<h2>Select a Treatment</h2>
		<div class="selection-grid">
			{#each treatments as treatment}
				<div
					class="selection-card"
					class:selected={selectedTreatmentId === treatment.id}
					onclick={() => selectedTreatmentId = treatment.id!}
				>
					<h3>{treatment.name}</h3>
					<p>{treatment.duration_minutes} minutes</p>
					<p class="price">${treatment.price.toFixed(2)}</p>
				</div>
			{/each}
		</div>
		<div class="actions">
			<button class="btn" onclick={prevStep}>Back</button>
			<button class="btn btn-primary" onclick={nextStep} disabled={!selectedTreatmentId}>
				Next
			</button>
		</div>
	</div>
{:else if step === 3}
	<div class="card">
		<h2>Pick a Time Slot</h2>
		
		<div class="form-group">
			<label for="date">Select Date</label>
			<input
				type="date"
				id="date"
				bind:value={selectedDate}
				min={new Date().toISOString().split('T')[0]}
			/>
		</div>
		
		{#if loading}
			<p>Loading available slots...</p>
		{:else if selectedDate && availableSlots.length === 0}
			<p>No available slots for this date. Try another date or this date is a weekend.</p>
		{:else if availableSlots.length > 0}
			<div class="slots-grid">
				{#each availableSlots as slot}
					<button
						class="slot"
						class:selected={selectedSlot?.time === slot.time}
						onclick={() => selectedSlot = slot}
					>
						{slot.time}
					</button>
				{/each}
			</div>
		{/if}
		
		<div class="actions">
			<button class="btn" onclick={prevStep}>Back</button>
			<button class="btn btn-primary" onclick={nextStep} disabled={!selectedSlot}>
				Next
			</button>
		</div>
	</div>
{:else if step === 4}
	<div class="card">
		<h2>Confirm Booking</h2>
		
		<div class="summary">
			<p><strong>Pet:</strong> {pets.find(p => p.id === selectedPetId)?.name}</p>
			<p><strong>Treatment:</strong> {treatments.find(t => t.id === selectedTreatmentId)?.name}</p>
			<p><strong>Date & Time:</strong> {selectedDate} at {selectedSlot?.time}</p>
		</div>
		
		<div class="form-group">
			<label for="notes">Notes (optional)</label>
			<textarea id="notes" bind:value={notes} rows="3" placeholder="Any special instructions..."></textarea>
		</div>
		
		<div class="actions">
			<button class="btn" onclick={prevStep}>Back</button>
			<button class="btn btn-primary" onclick={bookAppointment} disabled={loading}>
				{loading ? 'Booking...' : 'Book Appointment'}
			</button>
		</div>
	</div>
{/if}

<style>
	.steps {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	
	.step {
		flex: 1;
		padding: 1rem;
		background: white;
		border-radius: 8px;
		text-align: center;
		font-weight: 500;
		color: #7f8c8d;
	}
	
	.step.active {
		background: #3498db;
		color: white;
	}
	
	.step.completed {
		background: #27ae60;
		color: white;
	}
	
	.selection-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
		margin: 1rem 0;
	}
	
	.selection-card {
		padding: 1rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.selection-card:hover {
		border-color: #3498db;
		box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
	}
	
	.selection-card.selected {
		border-color: #3498db;
		background: #ebf5fb;
	}
	
	.selection-card h3 {
		margin: 0 0 0.5rem 0;
	}
	
	.selection-card p {
		margin: 0.25rem 0;
		color: #7f8c8d;
	}
	
	.selection-card .owner,
	.selection-card .price {
		font-weight: 500;
		color: #2c3e50;
	}
	
	.slots-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.5rem;
		margin: 1rem 0;
	}
	
	.slot {
		padding: 1rem;
		border: 2px solid #ddd;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.slot:hover {
		border-color: #3498db;
	}
	
	.slot.selected {
		border-color: #3498db;
		background: #3498db;
		color: white;
	}
	
	.summary {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
	
	.summary p {
		margin: 0.5rem 0;
	}
	
	.actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}
	
	.actions button {
		flex: 1;
	}
</style>
