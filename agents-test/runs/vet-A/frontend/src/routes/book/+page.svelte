<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { 
        getPets, 
        getTreatments, 
        getAvailableSlots, 
        createAppointment,
        type Pet, 
        type Treatment, 
        type AvailableSlot 
    } from '$lib/api';
    
    let step = $state(1);
    let pets: Pet[] = $state([]);
    let treatments: Treatment[] = $state([]);
    let availableSlots: AvailableSlot[] = $state([]);
    let loading = $state(false);
    let error = $state('');
    let success = $state('');
    
    let selectedPet: Pet | null = $state(null);
    let selectedTreatment: Treatment | null = $state(null);
    let selectedDate = $state('');
    let selectedSlot: AvailableSlot | null = $state(null);
    let notes = $state('');
    
    onMount(async () => {
        try {
            loading = true;
            [pets, treatments] = await Promise.all([getPets(), getTreatments()]);
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    });
    
    async function selectPet(pet: Pet) {
        selectedPet = pet;
        step = 2;
    }
    
    async function selectTreatment(treatment: Treatment) {
        selectedTreatment = treatment;
        step = 3;
    }
    
    async function loadSlots() {
        if (!selectedDate || !selectedTreatment) return;
        
        try {
            loading = true;
            error = '';
            availableSlots = await getAvailableSlots(selectedDate, selectedTreatment.id);
            if (availableSlots.length === 0) {
                error = 'No available slots for this date. Please choose another date.';
            }
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
    
    function selectSlot(slot: AvailableSlot) {
        selectedSlot = slot;
        step = 4;
    }
    
    async function confirmBooking() {
        if (!selectedPet || !selectedTreatment || !selectedSlot) return;
        
        try {
            loading = true;
            error = '';
            success = '';
            
            await createAppointment({
                pet_id: selectedPet.id,
                treatment_id: selectedTreatment.id,
                scheduled_at: selectedSlot.start_time,
                status: 'scheduled',
                notes: notes || undefined
            });
            
            success = 'Appointment booked successfully!';
            setTimeout(() => goto('/appointments'), 2000);
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
    
    function formatTime(dateStr: string) {
        return new Date(dateStr).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
</script>

<div>
    <h1>Book Appointment</h1>
    
    {#if error}
        <div class="error">{error}</div>
    {/if}
    
    {#if success}
        <div class="success">{success}</div>
    {/if}
    
    <div class="steps">
        <div class="step" class:active={step >= 1} class:completed={step > 1}>
            <div class="step-number">1</div>
            <div class="step-label">Select Pet</div>
        </div>
        <div class="step-line" class:active={step > 1}></div>
        <div class="step" class:active={step >= 2} class:completed={step > 2}>
            <div class="step-number">2</div>
            <div class="step-label">Choose Treatment</div>
        </div>
        <div class="step-line" class:active={step > 2}></div>
        <div class="step" class:active={step >= 3} class:completed={step > 3}>
            <div class="step-number">3</div>
            <div class="step-label">Pick Time Slot</div>
        </div>
        <div class="step-line" class:active={step > 3}></div>
        <div class="step" class:active={step >= 4}>
            <div class="step-number">4</div>
            <div class="step-label">Confirm</div>
        </div>
    </div>
    
    {#if step === 1}
        <div class="card">
            <h2>Select a Pet</h2>
            {#if loading}
                <p>Loading pets...</p>
            {:else if pets.length === 0}
                <p>No pets available. Please <a href="/pets">add a pet</a> first.</p>
            {:else}
                <div class="grid">
                    {#each pets as pet}
                        <button class="card-button" onclick={() => selectPet(pet)}>
                            <h3>{pet.name}</h3>
                            <p>{pet.species} • {pet.age_years} years</p>
                            <p class="owner">Owner: {pet.owner_name}</p>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
    
    {#if step === 2}
        <div class="card">
            <h2>Choose Treatment for {selectedPet?.name}</h2>
            <button class="btn" onclick={() => step = 1}>← Back</button>
            
            {#if loading}
                <p>Loading treatments...</p>
            {:else}
                <div class="grid">
                    {#each treatments as treatment}
                        <button class="card-button" onclick={() => selectTreatment(treatment)}>
                            <h3>{treatment.name}</h3>
                            <p>{treatment.duration_minutes} minutes • ${treatment.price}</p>
                            <p class="description">{treatment.description || ''}</p>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
    
    {#if step === 3}
        <div class="card">
            <h2>Pick a Time Slot</h2>
            <button class="btn" onclick={() => step = 2}>← Back</button>
            
            <div class="form-group" style="max-width: 300px; margin: 1rem 0;">
                <label for="date">Select Date</label>
                <input 
                    type="date" 
                    id="date" 
                    bind:value={selectedDate}
                    onchange={loadSlots}
                    min={new Date().toISOString().split('T')[0]}
                />
            </div>
            
            {#if loading}
                <p>Loading available slots...</p>
            {:else if selectedDate && availableSlots.length > 0}
                <div class="slots-grid">
                    {#each availableSlots as slot}
                        <button class="slot-button" onclick={() => selectSlot(slot)}>
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </button>
                    {/each}
                </div>
            {:else if selectedDate}
                <p>Select a date to see available slots (Monday-Friday, 8:00-17:00)</p>
            {/if}
        </div>
    {/if}
    
    {#if step === 4}
        <div class="card">
            <h2>Confirm Appointment</h2>
            <button class="btn" onclick={() => step = 3}>← Back</button>
            
            <div class="confirmation">
                <div class="info-group">
                    <strong>Pet:</strong>
                    <span>{selectedPet?.name} ({selectedPet?.species})</span>
                </div>
                
                <div class="info-group">
                    <strong>Owner:</strong>
                    <span>{selectedPet?.owner_name}</span>
                </div>
                
                <div class="info-group">
                    <strong>Treatment:</strong>
                    <span>{selectedTreatment?.name}</span>
                </div>
                
                <div class="info-group">
                    <strong>Duration:</strong>
                    <span>{selectedTreatment?.duration_minutes} minutes</span>
                </div>
                
                <div class="info-group">
                    <strong>Price:</strong>
                    <span>${selectedTreatment?.price}</span>
                </div>
                
                <div class="info-group">
                    <strong>Date & Time:</strong>
                    <span>{selectedSlot ? formatDate(selectedSlot.start_time) : ''}</span>
                    <span>{selectedSlot ? formatTime(selectedSlot.start_time) : ''} - {selectedSlot ? formatTime(selectedSlot.end_time) : ''}</span>
                </div>
                
                <div class="form-group">
                    <label for="notes">Notes (optional)</label>
                    <textarea id="notes" bind:value={notes} rows="3" placeholder="Any special instructions or notes..."></textarea>
                </div>
                
                <button class="btn btn-success btn-large" onclick={confirmBooking} disabled={loading}>
                    {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .steps {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 2rem 0;
        padding: 1rem;
    }
    
    .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }
    
    .step-number {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #e0e0e0;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        transition: all 0.3s;
    }
    
    .step.active .step-number {
        background: #3498db;
        color: white;
    }
    
    .step.completed .step-number {
        background: #2ecc71;
        color: white;
    }
    
    .step-label {
        font-size: 0.875rem;
        color: #666;
    }
    
    .step.active .step-label {
        color: #2c3e50;
        font-weight: 500;
    }
    
    .step-line {
        width: 60px;
        height: 2px;
        background: #e0e0e0;
        transition: background 0.3s;
    }
    
    .step-line.active {
        background: #2ecc71;
    }
    
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .card-button {
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        padding: 1.5rem;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }
    
    .card-button:hover {
        border-color: #3498db;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        transform: translateY(-2px);
    }
    
    .card-button h3 {
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
    }
    
    .card-button p {
        margin: 0.25rem 0;
        color: #666;
        font-size: 0.9rem;
    }
    
    .card-button .owner {
        color: #7f8c8d;
        font-size: 0.85rem;
    }
    
    .card-button .description {
        font-size: 0.85rem;
        font-style: italic;
        color: #95a5a6;
    }
    
    .slots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 0.75rem;
        margin-top: 1rem;
    }
    
    .slot-button {
        background: #ecf0f1;
        border: 2px solid #bdc3c7;
        border-radius: 6px;
        padding: 1rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }
    
    .slot-button:hover {
        background: #3498db;
        color: white;
        border-color: #3498db;
    }
    
    .confirmation {
        margin-top: 1.5rem;
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
    }
    
    .info-group {
        display: flex;
        flex-direction: column;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e0e0e0;
    }
    
    .info-group:last-of-type {
        border-bottom: none;
    }
    
    .info-group strong {
        color: #7f8c8d;
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
    }
    
    .info-group span {
        color: #2c3e50;
        font-size: 1.1rem;
    }
    
    .btn-large {
        width: 100%;
        padding: 1rem;
        font-size: 1.1rem;
        font-weight: 600;
        margin-top: 1rem;
    }
</style>
