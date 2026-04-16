<script lang="ts">
  import { onMount } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import { api } from '$lib/api';
  import type { AvailableSlots, Pet, Treatment } from '$lib/types';
  import {
    formatCurrency,
    formatDate,
    formatTime,
    nextClinicDateValue,
    titleCase
  } from '$lib/utils';

  let pets: Pet[] = [];
  let treatments: Treatment[] = [];
  let petId = 0;
  let treatmentId = 0;
  let appointmentDate = nextClinicDateValue();
  let selectedSlot = '';
  let notes = '';
  let slotResponse: AvailableSlots | null = null;
  let loadingReferences = true;
  let loadingSlots = false;
  let saving = false;
  let errorMessage = '';
  let successMessage = '';
  let slotRequestVersion = 0;

  async function loadReferences(): Promise<void> {
    loadingReferences = true;
    errorMessage = '';

    try {
      const [petData, treatmentData] = await Promise.all([api.listPets(), api.listTreatments()]);
      pets = petData;
      treatments = treatmentData;

      petId = pets[0]?.id ?? 0;
      treatmentId = treatments[0]?.id ?? 0;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to load booking data.';
    } finally {
      loadingReferences = false;
    }
  }

  async function loadSlots(): Promise<void> {
    if (!treatmentId || !appointmentDate) {
      slotResponse = null;
      return;
    }

    const requestVersion = ++slotRequestVersion;
    loadingSlots = true;
    errorMessage = '';

    try {
      const response = await api.availableSlots(appointmentDate, treatmentId);
      if (requestVersion !== slotRequestVersion) {
        return;
      }
      slotResponse = response;
      if (!response.slots.find((slot) => slot.start === selectedSlot)) {
        selectedSlot = '';
      }
    } catch (error) {
      if (requestVersion !== slotRequestVersion) {
        return;
      }
      slotResponse = null;
      errorMessage = error instanceof Error ? error.message : 'Unable to check slots.';
    } finally {
      if (requestVersion === slotRequestVersion) {
        loadingSlots = false;
      }
    }
  }

  async function bookAppointment(): Promise<void> {
    if (!petId || !treatmentId || !selectedSlot) {
      errorMessage = 'Choose a pet, treatment, and available slot before booking.';
      return;
    }

    saving = true;
    errorMessage = '';
    successMessage = '';

    try {
      await api.createAppointment({
        pet_id: petId,
        treatment_id: treatmentId,
        scheduled_at: selectedSlot,
        status: 'scheduled',
        notes: notes.trim() || null
      });
      successMessage = 'Appointment booked successfully.';
      notes = '';
      selectedSlot = '';
      await loadSlots();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to book the appointment.';
    } finally {
      saving = false;
    }
  }

  onMount(async () => {
    await loadReferences();
  });

  $: if (treatmentId && appointmentDate && !loadingReferences) {
    void loadSlots();
  }

  $: selectedPet = pets.find((pet) => pet.id === petId) ?? null;
  $: selectedTreatment = treatments.find((treatment) => treatment.id === treatmentId) ?? null;
</script>

<div class="page">
  <PageHeader
    eyebrow="Booking"
    title="Book appointment"
    description="Pick a patient, choose the care needed, and lock in a time that respects clinic hours and current bookings."
  />

  {#if errorMessage}
    <div class="banner error">{errorMessage}</div>
  {/if}

  {#if successMessage}
    <div class="banner success">{successMessage}</div>
  {/if}

  <div class="split">
    <Panel title="Booking form" subtitle="Only free clinic windows are shown for the selected treatment">
      {#if loadingReferences}
        <p class="muted">Loading pets and treatments...</p>
      {:else if pets.length === 0}
        <EmptyState
          title="Add a pet first"
          message="Bookings need a patient record, so create one on the Pets page before scheduling."
        />
      {:else}
        <form class="stack" on:submit|preventDefault={bookAppointment}>
          <div class="grid-two">
            <label>
              Pet
              <select bind:value={petId}>
                {#each pets as pet}
                  <option value={pet.id}>{pet.name} · {pet.owner_name}</option>
                {/each}
              </select>
            </label>

            <label>
              Treatment
              <select bind:value={treatmentId}>
                {#each treatments as treatment}
                  <option value={treatment.id}>{treatment.name}</option>
                {/each}
              </select>
            </label>
          </div>

          <label>
            Appointment date
            <input bind:value={appointmentDate} type="date" />
          </label>

          <label>
            Booking notes
            <textarea bind:value={notes} placeholder="Optional notes for the appointment" />
          </label>

          <div class="slot-header">
            <strong>Available slots</strong>
            {#if loadingSlots}
              <span>Checking live availability...</span>
            {/if}
          </div>

          {#if slotResponse?.slots.length}
            <div class="slot-grid">
              {#each slotResponse.slots as slot}
                <button
                  type="button"
                  class:selected-slot={selectedSlot === slot.start}
                  class="slot-button"
                  on:click={() => {
                    selectedSlot = slot.start;
                  }}
                >
                  <span>{formatTime(slot.start)}</span>
                  <small>{selectedTreatment?.duration_minutes ?? slotResponse.duration_minutes} min</small>
                </button>
              {/each}
            </div>
          {:else if loadingSlots}
            <p class="muted">Checking what is free...</p>
          {:else}
            <EmptyState
              title="No open slots"
              message="Try another weekday or choose a treatment with a shorter duration."
            />
          {/if}

          <button type="submit" disabled={saving || !selectedSlot}>Confirm booking</button>
        </form>
      {/if}
    </Panel>

    <div class="stack">
      <Panel title="Visit summary" subtitle="A quick read before you confirm">
        {#if !selectedPet || !selectedTreatment}
          <p class="muted">Choose a pet and treatment to see the booking summary.</p>
        {:else}
          <div class="summary">
            <article>
              <p>Patient</p>
              <strong>{selectedPet.name}</strong>
              <span>{titleCase(selectedPet.species)}{selectedPet.breed ? ` · ${selectedPet.breed}` : ''}</span>
            </article>
            <article>
              <p>Owner</p>
              <strong>{selectedPet.owner_name}</strong>
              <span>{selectedPet.owner_phone}</span>
            </article>
            <article>
              <p>Treatment</p>
              <strong>{selectedTreatment.name}</strong>
              <span>{selectedTreatment.duration_minutes} min · {formatCurrency(selectedTreatment.price)}</span>
            </article>
            <article>
              <p>Selected slot</p>
              <strong>{selectedSlot ? formatTime(selectedSlot) : 'Not selected yet'}</strong>
              <span>{formatDate(`${appointmentDate}T12:00:00`)}</span>
            </article>
          </div>
        {/if}
      </Panel>

      <Panel title="Booking rules" subtitle="Built into the backend, reflected here in the UI">
        <ul class="rules">
          <li>Appointments can only be booked Monday through Friday.</li>
          <li>Clinic hours run from 08:00 to 17:00 local time.</li>
          <li>Slots are hidden when they overlap with active appointments.</li>
          <li>Cancelled appointments immediately free their time back up.</li>
        </ul>
      </Panel>
    </div>
  </div>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 1rem;
  }

  .slot-header,
  .summary {
    display: grid;
    gap: 0.75rem;
  }

  .slot-header {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .slot-header span,
  .muted {
    color: var(--muted);
  }

  .slot-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .slot-button {
    display: grid;
    gap: 0.25rem;
    padding: 0.9rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.72);
    cursor: pointer;
  }

  .slot-button.selected-slot {
    background: linear-gradient(135deg, rgba(145, 184, 167, 0.95), rgba(219, 237, 224, 0.95));
    color: var(--ink-strong);
    font-weight: 700;
  }

  .summary article {
    display: grid;
    gap: 0.25rem;
    padding: 1rem;
    border-radius: 1.15rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .summary p,
  .summary strong,
  .summary span {
    margin: 0;
  }

  .summary p {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .rules {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding-left: 1.15rem;
    color: var(--muted);
    line-height: 1.5;
  }

  .muted {
    margin: 0;
  }

  @media (max-width: 1050px) {
    .split {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .slot-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
