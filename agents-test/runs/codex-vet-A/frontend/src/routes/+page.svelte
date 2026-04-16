<script lang="ts">
  import { onMount } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import TimelineView from '$lib/components/TimelineView.svelte';
  import { api } from '$lib/api';
  import type { Appointment, Pet, Treatment } from '$lib/types';
  import { formatDate, formatDateTime, toDateInputValue } from '$lib/utils';

  let pets: Pet[] = [];
  let treatments: Treatment[] = [];
  let todaysAppointments: Appointment[] = [];
  let allAppointments: Appointment[] = [];
  let loading = true;
  let errorMessage = '';

  async function loadDashboard(): Promise<void> {
    loading = true;
    errorMessage = '';

    try {
      const today = toDateInputValue();
      const [petData, treatmentData, todayData, appointmentData] = await Promise.all([
        api.listPets(),
        api.listTreatments(),
        api.listAppointments({ date: today }),
        api.listAppointments()
      ]);

      pets = petData;
      treatments = treatmentData;
      todaysAppointments = todayData;
      allAppointments = appointmentData;
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : 'Unable to load the dashboard right now.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadDashboard();
  });

  $: upcomingAppointments = allAppointments
    .filter((appointment) => {
      const scheduledAt = new Date(appointment.scheduled_at);
      return appointment.status !== 'cancelled' && scheduledAt >= new Date();
    })
    .slice(0, 4);

  $: completedToday = todaysAppointments.filter((appointment) => appointment.status === 'completed').length;
</script>

<div class="page">
  <PageHeader
    eyebrow="Daily briefing"
    title="Clinic dashboard"
    description="See today’s visit queue, how busy the week looks, and whether the care roster needs attention."
    actionHref="/book"
    actionLabel="Book a visit"
  />

  {#if errorMessage}
    <div class="banner error">{errorMessage}</div>
  {/if}

  <div class="stats">
    <StatCard label="Total pets" value={`${pets.length}`} hint="Patient records in the clinic" tone="sage" />
    <StatCard
      label="Upcoming visits"
      value={`${upcomingAppointments.length}`}
      hint="The next four active appointments"
      tone="clay"
    />
    <StatCard
      label="Treatments"
      value={`${treatments.length}`}
      hint={`${completedToday} finished today`}
      tone="sun"
    />
  </div>

  <div class="dashboard-grid">
    <Panel title="Today's appointments" subtitle={formatDate(new Date())}>
      {#if loading}
        <p class="muted">Loading today’s schedule...</p>
      {:else if todaysAppointments.length === 0}
        <EmptyState
          title="A clear waiting room"
          message="There are no appointments scheduled for today yet."
        />
      {:else}
        <TimelineView appointments={todaysAppointments} interactive={false} />
      {/if}
    </Panel>

    <Panel title="Coming up next" subtitle="A quick look beyond today">
      {#if loading}
        <p class="muted">Loading upcoming visits...</p>
      {:else if upcomingAppointments.length === 0}
        <EmptyState
          title="No upcoming visits"
          message="Once new appointments are booked, the next stops on the calendar will show here."
        />
      {:else}
        <div class="stack">
          {#each upcomingAppointments as appointment}
            <article class="upcoming-card">
              <div>
                <strong>{appointment.pet.name}</strong>
                <p>{appointment.treatment.name} for {appointment.pet.owner_name}</p>
              </div>
              <span>{formatDateTime(appointment.scheduled_at)}</span>
            </article>
          {/each}
        </div>
      {/if}
    </Panel>
  </div>

  <Panel title="Clinic snapshot" subtitle="Healthy rhythm across patients, care options, and follow-up flow">
    <div class="snapshot-grid">
      <article>
        <strong>{todaysAppointments.length}</strong>
        <p>appointments on today's board</p>
      </article>
      <article>
        <strong>{pets.filter((pet) => pet.species === 'dog').length}</strong>
        <p>dogs in the patient roster</p>
      </article>
      <article>
        <strong>{pets.filter((pet) => pet.species === 'cat').length}</strong>
        <p>cats in the patient roster</p>
      </article>
      <article>
        <strong>{treatments[0]?.name ?? 'Ready'}</strong>
        <p>front-of-list treatment seeded on first run</p>
      </article>
    </div>
  </Panel>
</div>

<style>
  .stats,
  .dashboard-grid,
  .snapshot-grid {
    display: grid;
    gap: 1rem;
  }

  .stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1.4fr 1fr;
  }

  .snapshot-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .snapshot-grid article {
    padding: 1.1rem;
    border-radius: 1.2rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .snapshot-grid strong {
    display: block;
    margin-bottom: 0.35rem;
    font-family: var(--font-display);
    font-size: 1.6rem;
  }

  .snapshot-grid p,
  .muted,
  .upcoming-card p,
  .upcoming-card span {
    margin: 0;
    color: var(--muted);
    line-height: 1.5;
  }

  .upcoming-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
    border-radius: 1.15rem;
    background: rgba(255, 255, 255, 0.74);
  }

  .upcoming-card strong {
    display: block;
    margin-bottom: 0.2rem;
  }

  @media (max-width: 900px) {
    .stats,
    .dashboard-grid,
    .snapshot-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
