<script lang="ts">
  import { onMount } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import TimelineView from '$lib/components/TimelineView.svelte';
  import { api } from '$lib/api';
  import type { Appointment, AppointmentPayload, AppointmentStatus, Pet, Treatment } from '$lib/types';
  import {
    appointmentStatusOptions,
    dateRangeAround,
    formatDateTime,
    formatShortDate,
    toDateInputValue,
    toDateTimeLocalValue
  } from '$lib/utils';

  type AppointmentForm = {
    pet_id: number;
    treatment_id: number;
    scheduled_at: string;
    status: AppointmentStatus;
    notes: string;
  };

  let appointments: Appointment[] = [];
  let pets: Pet[] = [];
  let treatments: Treatment[] = [];
  let selectedAppointment: Appointment | null = null;
  let form: AppointmentForm | null = null;
  let filterDate = toDateInputValue();
  let statusFilter = '';
  let petFilter = '';
  let loading = true;
  let saving = false;
  let errorMessage = '';
  let successMessage = '';

  async function loadReferenceData(): Promise<void> {
    const [petData, treatmentData] = await Promise.all([api.listPets(), api.listTreatments()]);
    pets = petData;
    treatments = treatmentData;
  }

  async function loadAppointments(): Promise<void> {
    loading = true;
    errorMessage = '';

    try {
      appointments = await api.listAppointments({
        date: filterDate,
        pet_id: petFilter ? Number(petFilter) : undefined,
        status: statusFilter || undefined
      });

      if (selectedAppointment) {
        const refreshed = appointments.find((appointment) => appointment.id === selectedAppointment?.id);
        if (refreshed) {
          selectAppointment(refreshed);
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to load appointments.';
    } finally {
      loading = false;
    }
  }

  function selectAppointment(appointment: Appointment): void {
    selectedAppointment = appointment;
    form = {
      pet_id: appointment.pet_id,
      treatment_id: appointment.treatment_id,
      scheduled_at: toDateTimeLocalValue(appointment.scheduled_at),
      status: appointment.status,
      notes: appointment.notes ?? ''
    };
    successMessage = '';
    errorMessage = '';
  }

  function clearSelection(): void {
    selectedAppointment = null;
    form = null;
    successMessage = '';
  }

  function buildPayload(): AppointmentPayload {
    if (!form) {
      throw new Error('Select an appointment first.');
    }

    return {
      pet_id: Number(form.pet_id),
      treatment_id: Number(form.treatment_id),
      scheduled_at: form.scheduled_at,
      status: form.status,
      notes: form.notes.trim() || null
    };
  }

  async function saveAppointment(): Promise<void> {
    if (!selectedAppointment || !form) {
      return;
    }

    saving = true;
    errorMessage = '';
    successMessage = '';

    try {
      const updated = await api.updateAppointment(selectedAppointment.id, buildPayload());
      successMessage = 'Appointment updated.';
      selectedAppointment = updated;
      form = {
        pet_id: updated.pet_id,
        treatment_id: updated.treatment_id,
        scheduled_at: toDateTimeLocalValue(updated.scheduled_at),
        status: updated.status,
        notes: updated.notes ?? ''
      };
      await loadAppointments();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to update the appointment.';
    } finally {
      saving = false;
    }
  }

  async function cancelSelectedAppointment(): Promise<void> {
    if (!selectedAppointment) {
      return;
    }

    if (!window.confirm('Cancel this appointment? The slot will become available again.')) {
      return;
    }

    errorMessage = '';
    successMessage = '';

    try {
      await api.cancelAppointment(selectedAppointment.id);
      successMessage = 'Appointment cancelled and the slot is free again.';
      clearSelection();
      await loadAppointments();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to cancel this appointment.';
    }
  }

  function resetFilters(): void {
    filterDate = toDateInputValue();
    statusFilter = '';
    petFilter = '';
    clearSelection();
    void loadAppointments();
  }

  onMount(async () => {
    try {
      await loadReferenceData();
      await loadAppointments();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to load appointment tools.';
      loading = false;
    }
  });

  $: visibleDates = dateRangeAround(filterDate, 5);
</script>

<div class="page">
  <PageHeader
    eyebrow="Calendar"
    title="Appointments"
    description="Filter the visit board by day, adjust status, reschedule when needed, and cancel without losing the patient record."
    actionHref="/book"
    actionLabel="New booking"
  />

  {#if errorMessage}
    <div class="banner error">{errorMessage}</div>
  {/if}

  {#if successMessage}
    <div class="banner success">{successMessage}</div>
  {/if}

  <Panel title="Filters" subtitle="Narrow the schedule to the day, patient, or visit status you care about">
    <div class="filter-grid">
      <label>
        Date
        <input bind:value={filterDate} type="date" on:change={loadAppointments} />
      </label>

      <label>
        Status
        <select bind:value={statusFilter} on:change={loadAppointments}>
          <option value="">All statuses</option>
          {#each appointmentStatusOptions as status}
            <option value={status}>{status}</option>
          {/each}
        </select>
      </label>

      <label>
        Pet
        <select bind:value={petFilter} on:change={loadAppointments}>
          <option value="">All pets</option>
          {#each pets as pet}
            <option value={pet.id}>{pet.name}</option>
          {/each}
        </select>
      </label>

      <div class="filter-actions">
        <button type="button" class="secondary" on:click={loadAppointments}>Apply</button>
        <button type="button" class="ghost" on:click={resetFilters}>Reset</button>
      </div>
    </div>
  </Panel>

  <div class="split">
    <div class="stack">
      <Panel title="Day view" subtitle={`Showing ${appointments.length} appointments for ${filterDate}`}>
        <div class="day-strip">
          {#each visibleDates as day}
            <button
              type="button"
              class:selected-day={day === filterDate}
              on:click={() => {
                filterDate = day;
                void loadAppointments();
              }}
            >
              {formatShortDate(day)}
            </button>
          {/each}
        </div>

        {#if loading}
          <p class="muted">Loading the visit board...</p>
        {:else if appointments.length === 0}
          <EmptyState
            title="No appointments for this filter"
            message="Try another day or status to find bookings."
          />
        {:else}
          <TimelineView appointments={appointments} on:select={(event) => selectAppointment(event.detail)} />
        {/if}
      </Panel>

      <Panel title="Agenda list" subtitle="A compact list for front-desk scanning">
        {#if appointments.length === 0}
          <p class="muted">The agenda is empty for this view.</p>
        {:else}
          <div class="agenda-list">
            {#each appointments as appointment}
              <button type="button" class="agenda-row" on:click={() => selectAppointment(appointment)}>
                <div>
                  <strong>{appointment.pet.name}</strong>
                  <p>{appointment.treatment.name}</p>
                </div>
                <div class="agenda-row__meta">
                  <span>{formatDateTime(appointment.scheduled_at)}</span>
                  <StatusPill status={appointment.status} />
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </Panel>
    </div>

    <Panel
      title={selectedAppointment ? 'Edit appointment' : 'Appointment details'}
      subtitle={
        selectedAppointment
          ? `Editing ${selectedAppointment.pet.name} · ${selectedAppointment.treatment.name}`
          : 'Select an appointment from the day view or agenda list.'
      }
    >
      {#if !selectedAppointment || !form}
        <EmptyState
          title="No appointment selected"
          message="Click any appointment on the left to reschedule it or change its status."
        />
      {:else}
        <form class="stack" on:submit|preventDefault={saveAppointment}>
          <div class="grid-two">
            <label>
              Pet
              <select bind:value={form.pet_id}>
                {#each pets as pet}
                  <option value={pet.id}>{pet.name}</option>
                {/each}
              </select>
            </label>

            <label>
              Treatment
              <select bind:value={form.treatment_id}>
                {#each treatments as treatment}
                  <option value={treatment.id}>{treatment.name}</option>
                {/each}
              </select>
            </label>
          </div>

          <div class="grid-two">
            <label>
              Scheduled time
              <input bind:value={form.scheduled_at} type="datetime-local" />
            </label>

            <label>
              Status
              <select bind:value={form.status}>
                {#each appointmentStatusOptions as status}
                  <option value={status}>{status}</option>
                {/each}
              </select>
            </label>
          </div>

          <label>
            Notes
            <textarea bind:value={form.notes} placeholder="Visit notes or front-desk reminders" />
          </label>

          <div class="actions">
            <button type="submit" disabled={saving}>Save appointment</button>
            <button type="button" class="secondary" on:click={clearSelection}>Close</button>
            <button type="button" class="ghost" on:click={cancelSelectedAppointment}>Cancel appointment</button>
          </div>
        </form>
      {/if}
    </Panel>
  </div>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: 1.25fr 0.95fr;
    gap: 1rem;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    align-items: end;
  }

  .filter-actions,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .day-strip,
  .agenda-list {
    display: grid;
    gap: 0.75rem;
  }

  .day-strip {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    margin-bottom: 1rem;
  }

  .day-strip button {
    padding: 0.85rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.68);
    color: var(--muted);
    cursor: pointer;
  }

  .day-strip button.selected-day {
    background: linear-gradient(135deg, rgba(214, 139, 100, 0.95), rgba(250, 220, 203, 0.9));
    color: var(--ink-strong);
    font-weight: 700;
  }

  .agenda-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    padding: 1rem;
    border-radius: 1.15rem;
    background: rgba(255, 255, 255, 0.72);
    text-align: left;
    cursor: pointer;
  }

  .agenda-row strong,
  .agenda-row p,
  .agenda-row span {
    margin: 0;
  }

  .agenda-row p,
  .agenda-row span,
  .muted {
    color: var(--muted);
    line-height: 1.5;
  }

  .agenda-row__meta {
    display: grid;
    justify-items: end;
    gap: 0.5rem;
  }

  .muted {
    margin: 0;
  }

  @media (max-width: 1100px) {
    .split {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .filter-grid,
    .day-strip {
      grid-template-columns: 1fr;
    }

    .agenda-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .agenda-row__meta {
      justify-items: start;
    }
  }
</style>
