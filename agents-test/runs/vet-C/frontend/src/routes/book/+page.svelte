<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getPets, getTreatments, getAvailableSlots, createAppointment, type Pet, type Treatment, type TimeSlot } from '$lib/api';

	let step = $state(1);
	let pets = $state<Pet[]>([]);
	let treatments = $state<Treatment[]>([]);
	let availableSlots = $state<TimeSlot[]>([]);
	
	let selectedPet = $state<Pet | null>(null);
	let selectedTreatment = $state<Treatment | null>(null);
	let selectedDate = $state('');
	let selectedSlot = $state<TimeSlot | null>(null);
	let notes = $state('');
	
	let loading = $state(false);
	let error = $state('');

	onMount(async () => {
		try {
			pets = await getPets();
			treatments = await getTreatments();
			// Set default date to tomorrow
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			selectedDate = tomorrow.toISOString().split('T')[0];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load data';
		}
	});

	async function loadAvailableSlots() {
		if (!selectedTreatment || !selectedDate) return;
		try {
			loading = true;
			error = '';
			availableSlots = await getAvailableSlots(selectedDate, selectedTreatment.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load available slots';
			availableSlots = [];
		} finally {
			loading = false;
		}
	}

	function selectPet(pet: Pet) {
		selectedPet = pet;
		step = 2;
	}

	async function selectTreatment(treatment: Treatment) {
		selectedTreatment = treatment;
		step = 3;
		await loadAvailableSlots();
	}

	function selectSlot(slot: TimeSlot) {
		selectedSlot = slot;
		step = 4;
	}

	async function handleDateChange() {
		selectedSlot = null;
		await loadAvailableSlots();
	}

	async function bookAppointment() {
		if (!selectedPet || !selectedTreatment || !selectedSlot) return;
		
		try {
			loading = true;
			error = '';
			await createAppointment({
				pet_id: selectedPet.id,
				treatment_id: selectedTreatment.id,
				scheduled_at: selectedSlot.start_time,
				notes: notes || undefined
			});
			goto('/appointments');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to book appointment';
		} finally {
			loading = false;
		}
	}

	function formatTime(datetime: string): string {
		return new Date(datetime).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function reset() {
		step = 1;
		selectedPet = null;
		selectedTreatment = null;
		selectedSlot = null;
		notes = '';
		error = '';
	}
</script>

<div class="container">
	<div class="header">
		<h1>Book Appointment</h1>
		{#if step > 1}
			<button class="btn-secondary" onclick={reset}>Start Over</button>
		{/if}
	</div>

	<div class="progress-bar">
		<div class="progress-step {step >= 1 ? 'active' : ''}">1. Select Pet</div>
		<div class="progress-step {step >= 2 ? 'active' : ''}">2. Choose Treatment</div>
		<div class="progress-step {step >= 3 ? 'active' : ''}">3. Pick Time Slot</div>
		<div class="progress-step {step >= 4 ? 'active' : ''}">4. Confirm</div>
	</div>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if step === 1}
		<div class="step-content">
			<h2>Select a Pet</h2>
			{#if pets.length === 0}
				<p>No pets found. Please <a href="/pets">add a pet</a> first.</p>
			{:else}
				<div class="selection-grid">
					{#each pets as pet}
						<button class="selection-card" onclick={() => selectPet(pet)}>
							<div class="card-header">
								<h3>{pet.name}</h3>
								<span class="badge">{pet.species}</span>
							</div>
							<div class="card-info">
								<p>Age: {pet.age_years} years</p>
								{#if pet.breed}
									<p>Breed: {pet.breed}</p>
								{/if}
								<p>Owner: {pet.owner_name}</p>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if step === 2}
		<div class="step-content">
			<h2>Choose Treatment for {selectedPet?.name}</h2>
			<div class="selection-grid">
				{#each treatments as treatment}
					<button class="selection-card" onclick={() => selectTreatment(treatment)}>
						<div class="card-header">
							<h3>{treatment.name}</h3>
							<span class="price-badge">${Number(treatment.price).toFixed(2)}</span>
						</div>
						<div class="card-info">
							<p>Duration: {treatment.duration_minutes} minutes</p>
							{#if treatment.description}
								<p class="description">{treatment.description}</p>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if step === 3}
		<div class="step-content">
			<h2>Pick a Time Slot</h2>
			<div class="selected-info">
				<p><strong>Pet:</strong> {selectedPet?.name}</p>
				<p><strong>Treatment:</strong> {selectedTreatment?.name} ({selectedTreatment?.duration_minutes} min)</p>
			</div>

			<div class="date-selector">
				<label for="date">Select Date:</label>
				<input 
					type="date" 
					id="date" 
					bind:value={selectedDate} 
					oninput={handleDateChange}
					min={new Date().toISOString().split('T')[0]}
				/>
			</div>

			{#if loading}
				<p>Loading available slots...</p>
			{:else if availableSlots.length === 0}
				<p class="no-slots">No available slots for this date. Try another day or check if it's a weekend.</p>
			{:else}
				<div class="slots-grid">
					{#each availableSlots as slot}
						<button class="slot-button" onclick={() => selectSlot(slot)}>
							{formatTime(slot.start_time)}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if step === 4}
		<div class="step-content">
			<h2>Confirm Appointment</h2>
			<div class="confirmation-card">
				<div class="confirmation-section">
					<h3>Pet Information</h3>
					<p><strong>Name:</strong> {selectedPet?.name}</p>
					<p><strong>Species:</strong> {selectedPet?.species}</p>
					{#if selectedPet?.breed}
						<p><strong>Breed:</strong> {selectedPet.breed}</p>
					{/if}
					<p><strong>Owner:</strong> {selectedPet?.owner_name}</p>
					<p><strong>Phone:</strong> {selectedPet?.owner_phone}</p>
				</div>

				<div class="confirmation-section">
					<h3>Treatment</h3>
					<p><strong>Service:</strong> {selectedTreatment?.name}</p>
					<p><strong>Duration:</strong> {selectedTreatment?.duration_minutes} minutes</p>
					<p><strong>Price:</strong> ${Number(selectedTreatment?.price).toFixed(2)}</p>
				</div>

				<div class="confirmation-section">
					<h3>Appointment Time</h3>
					<p><strong>Date:</strong> {formatDate(selectedDate)}</p>
					<p><strong>Time:</strong> {selectedSlot ? formatTime(selectedSlot.start_time) : ''}</p>
				</div>

				<div class="confirmation-section">
					<h3>Notes (Optional)</h3>
					<textarea bind:value={notes} placeholder="Any special notes or instructions..." rows="3"></textarea>
				</div>

				<div class="confirmation-actions">
					<button class="btn-secondary" onclick={() => step = 3}>Back</button>
					<button class="btn-primary" onclick={bookAppointment} disabled={loading}>
						{loading ? 'Booking...' : 'Confirm Booking'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: bold;
		color: #1f2937;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1.5rem;
		color: #374151;
	}

	.progress-bar {
		display: flex;
		justify-content: space-between;
		margin-bottom: 3rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}

	.progress-step {
		flex: 1;
		text-align: center;
		padding: 0.75rem;
		color: #9ca3af;
		font-weight: 500;
		font-size: 0.875rem;
		position: relative;
	}

	.progress-step.active {
		color: #3b82f6;
		font-weight: 600;
	}

	.step-content {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 2rem;
	}

	.selection-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.selection-card {
		background: #f9fafb;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.selection-card:hover {
		border-color: #3b82f6;
		background: white;
		transform: translateY(-2px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.card-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.badge {
		background: #dbeafe;
		color: #1e40af;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.price-badge {
		background: #dcfce7;
		color: #166534;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.card-info p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: #374151;
	}

	.description {
		color: #6b7280;
		font-style: italic;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
	}

	.selected-info {
		background: #f3f4f6;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
	}

	.selected-info p {
		margin: 0.5rem 0;
		color: #374151;
	}

	.date-selector {
		margin-bottom: 1.5rem;
	}

	.date-selector label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
	}

	.date-selector input {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
		width: 100%;
		max-width: 300px;
	}

	.slots-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	.slot-button {
		background: #f3f4f6;
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		padding: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s;
	}

	.slot-button:hover {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.confirmation-card {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.confirmation-section {
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 6px;
	}

	.confirmation-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem;
	}

	.confirmation-section p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: #374151;
	}

	.confirmation-section textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.confirmation-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 1rem;
	}

	.no-slots {
		padding: 2rem;
		text-align: center;
		color: #6b7280;
		background: #f9fafb;
		border-radius: 6px;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-primary:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.error {
		color: #dc2626;
		padding: 1rem;
		background: #fee2e2;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	a {
		color: #3b82f6;
		text-decoration: underline;
	}
</style>
