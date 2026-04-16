<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getPets, getTreatments, getAvailableSlots, createAppointment,
		type Pet, type Treatment, type AvailableSlot
	} from '$lib/api';

	let step = $state(1);
	let pets = $state<Pet[]>([]);
	let treatments = $state<Treatment[]>([]);
	let slots = $state<AvailableSlot[]>([]);
	let loading = $state(true);
	let slotsLoading = $state(false);
	let error = $state('');

	let selectedPetId = $state<number | null>(null);
	let selectedTreatmentId = $state<number | null>(null);
	let selectedDate = $state('');
	let selectedSlot = $state<AvailableSlot | null>(null);
	let notes = $state('');

	onMount(async () => {
		try {
			[pets, treatments] = await Promise.all([getPets(), getTreatments()]);
		} catch (e: any) {
			console.error(e);
		}
		loading = false;
	});

	function getMinDate(): string {
		const d = new Date();
		return d.toISOString().split('T')[0];
	}

	async function loadSlots() {
		if (!selectedDate || !selectedTreatmentId) return;
		slotsLoading = true;
		slots = [];
		selectedSlot = null;
		try {
			slots = await getAvailableSlots(selectedDate, selectedTreatmentId);
		} catch (e: any) {
			error = e.message;
		}
		slotsLoading = false;
	}

	function nextStep() {
		error = '';
		if (step === 1 && !selectedPetId) {
			error = 'Please select a pet';
			return;
		}
		if (step === 2 && !selectedTreatmentId) {
			error = 'Please select a treatment';
			return;
		}
		if (step === 3 && !selectedSlot) {
			error = 'Please select a time slot';
			return;
		}
		step++;
	}

	function prevStep() {
		error = '';
		step--;
	}

	async function confirm() {
		if (!selectedPetId || !selectedTreatmentId || !selectedSlot) return;
		error = '';
		try {
			await createAppointment({
				pet_id: selectedPetId,
				treatment_id: selectedTreatmentId,
				scheduled_at: selectedSlot.start,
				notes: notes || undefined
			});
			goto('/appointments');
		} catch (e: any) {
			error = e.message;
		}
	}

	function formatSlotTime(dt: string): string {
		return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	$effect(() => {
		if (selectedDate && selectedTreatmentId) {
			loadSlots();
		}
	});

	function selectedPet(): Pet | undefined {
		return pets.find(p => p.id === selectedPetId);
	}

	function selectedTreatment(): Treatment | undefined {
		return treatments.find(t => t.id === selectedTreatmentId);
	}
</script>

<svelte:head><title>Book Appointment – VetClinic</title></svelte:head>

<h1>Book Appointment</h1>
<p style="color: var(--text-muted); margin-bottom: 1.5rem;">
	Step {step} of 4: {step === 1 ? 'Select Pet' : step === 2 ? 'Select Treatment' : step === 3 ? 'Pick Time Slot' : 'Confirm'}
</p>

{#if loading}
	<p>Loading...</p>
{:else}

	{#if step === 1}
		<div class="card">
			<h2>Select a Pet</h2>
			{#if pets.length === 0}
				<p style="color: var(--text-muted); margin-top: 0.5rem;">
					No pets registered. <a href="/pets">Add a pet first.</a>
				</p>
			{:else}
				<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
					{#each pets as pet}
						<button
							class="slot-btn"
							class:selected={selectedPetId === pet.id}
							onclick={() => selectedPetId = pet.id}
						>
							<strong>{pet.name}</strong><br>
							<small style="color: var(--text-muted);">{pet.species} · {pet.owner_name}</small>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if step === 2}
		<div class="card">
			<h2>Select a Treatment</h2>
			<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
				{#each treatments as t}
					<button
						class="slot-btn"
						class:selected={selectedTreatmentId === t.id}
						onclick={() => selectedTreatmentId = t.id}
					>
						<strong>{t.name}</strong><br>
						<small style="color: var(--text-muted);">{t.duration_minutes} min · ${t.price.toFixed(2)}</small>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if step === 3}
		<div class="card">
			<h2>Pick a Date & Time</h2>
			<div class="form-group" style="max-width: 250px; margin-top: 0.5rem;">
				<label for="appt-date">Date</label>
				<input id="appt-date" type="date" min={getMinDate()} bind:value={selectedDate} />
			</div>

			{#if slotsLoading}
				<p>Loading available slots...</p>
			{:else if selectedDate && slots.length === 0}
				<p style="color: var(--text-muted);">No available slots for this date. Try another day (Mon-Fri).</p>
			{:else if slots.length > 0}
				<p style="margin-bottom: 0.5rem; font-weight: 500;">Available slots:</p>
				<div class="slots-grid">
					{#each slots as slot}
						<button
							class="slot-btn"
							class:selected={selectedSlot?.start === slot.start}
							onclick={() => selectedSlot = slot}
						>
							{formatSlotTime(slot.start)} – {formatSlotTime(slot.end)}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if step === 4}
		<div class="card">
			<h2>Confirm Appointment</h2>
			<div style="display: grid; gap: 0.5rem; margin: 1rem 0;">
				<p><strong>Pet:</strong> {selectedPet()?.name} ({selectedPet()?.species})</p>
				<p><strong>Treatment:</strong> {selectedTreatment()?.name} – ${selectedTreatment()?.price.toFixed(2)}</p>
				<p><strong>Date:</strong> {selectedDate}</p>
				<p><strong>Time:</strong> {selectedSlot ? formatSlotTime(selectedSlot.start) + ' – ' + formatSlotTime(selectedSlot.end) : ''}</p>
			</div>
			<div class="form-group">
				<label for="appt-notes">Notes (optional)</label>
				<textarea id="appt-notes" bind:value={notes} rows="2"></textarea>
			</div>
		</div>
	{/if}

	{#if error}
		<p class="error" style="margin-bottom: 1rem;">{error}</p>
	{/if}

	<div style="display: flex; gap: 0.5rem;">
		{#if step > 1}
			<button class="btn btn-secondary" onclick={prevStep}>← Back</button>
		{/if}
		{#if step < 4}
			<button class="btn btn-primary" onclick={nextStep}>Next →</button>
		{:else}
			<button class="btn btn-success" onclick={confirm}>✓ Confirm Booking</button>
		{/if}
	</div>
{/if}
