<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let step = $state(1);
  let pets = $state([]);
  let treatments = $state([]);
  let slots = $state([]);
  
  let selectedPet = $state(null);
  let selectedTreatment = $state(null);
  let selectedDate = $state('');
  let selectedSlot = $state('');
  let notes = $state('');
  
  onMount(async () => {
    const [petsRes, treatmentsRes] = await Promise.all([
      fetch('/api/pets'),
      fetch('/api/treatments')
    ]);
    
    pets = await petsRes.json();
    treatments = await treatmentsRes.json();
  });
  
  async function loadSlots() {
    if (!selectedDate || !selectedTreatment) return;
    
    const res = await fetch(`/api/appointments/available-slots?date=${selectedDate}&treatment_id=${selectedTreatment}`);
    slots = await res.json();
  }
  
  async function bookAppointment() {
    const appointment = {
      pet_id: selectedPet,
      treatment_id: selectedTreatment,
      scheduled_at: selectedSlot,
      notes
    };
    
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointment)
    });
    
    if (res.ok) {
      alert('Appointment booked successfully!');
      goto('/appointments');
    } else {
      const error = await res.json();
      alert(error.detail || 'Failed to book appointment');
    }
  }
  
  function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<h1>Book Appointment</h1>

<div class="card">
  {#if step === 1}
    <h2>Step 1: Select Pet</h2>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;">
      {#each pets as pet}
        <div 
          class="card" 
          style="cursor: pointer; border: 2px solid {selectedPet === pet.id ? '#3498db' : '#ddd'};"
          onclick={() => { selectedPet = pet.id; step = 2; }}
        >
          <h3>{pet.name}</h3>
          <p>{pet.species} - {pet.breed || 'Mixed'}</p>
          <p>{pet.owner_name}</p>
        </div>
      {/each}
    </div>
    
  {:else if step === 2}
    <h2>Step 2: Select Treatment</h2>
    <button class="btn" onclick={() => step = 1}>← Back</button>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;">
      {#each treatments as treatment}
        <div 
          class="card" 
          style="cursor: pointer; border: 2px solid {selectedTreatment === treatment.id ? '#3498db' : '#ddd'};"
          onclick={() => { selectedTreatment = treatment.id; step = 3; }}
        >
          <h3>{treatment.name}</h3>
          <p>{treatment.duration_minutes} minutes</p>
          <p>${treatment.price}</p>
          <p style="font-size: 0.875rem; color: #666;">{treatment.description}</p>
        </div>
      {/each}
    </div>
    
  {:else if step === 3}
    <h2>Step 3: Select Date & Time</h2>
    <button class="btn" onclick={() => step = 2}>← Back</button>
    
    <div style="margin-top: 1rem;">
      <div class="form-group">
        <label>Date</label>
        <input type="date" bind:value={selectedDate} oninput={loadSlots} />
      </div>
      
      {#if slots.length > 0}
        <label>Available Time Slots</label>
        <div class="slot-grid">
          {#each slots as slot}
            <button 
              class="slot-btn {selectedSlot === slot ? 'selected' : ''}"
              onclick={() => { selectedSlot = slot; step = 4; }}
            >
              {formatTime(slot)}
            </button>
          {/each}
        </div>
      {:else if selectedDate}
        <p>No available slots for this date</p>
      {/if}
    </div>
    
  {:else if step === 4}
    <h2>Step 4: Confirm</h2>
    <button class="btn" onclick={() => step = 3}>← Back</button>
    
    <div style="margin-top: 1rem;">
      <p><strong>Pet:</strong> {pets.find(p => p.id === selectedPet)?.name}</p>
      <p><strong>Treatment:</strong> {treatments.find(t => t.id === selectedTreatment)?.name}</p>
      <p><strong>Date & Time:</strong> {new Date(selectedSlot).toLocaleString()}</p>
      
      <div class="form-group">
        <label>Notes (optional)</label>
        <textarea bind:value={notes}></textarea>
      </div>
      
      <button class="btn btn-success" onclick={bookAppointment}>Confirm Booking</button>
    </div>
  {/if}
</div>
