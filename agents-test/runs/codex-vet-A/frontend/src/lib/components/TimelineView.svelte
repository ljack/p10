<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import StatusPill from '$lib/components/StatusPill.svelte';
  import type { Appointment } from '$lib/types';
  import { formatTime } from '$lib/utils';

  export let appointments: Appointment[] = [];
  export let interactive = true;

  const dispatch = createEventDispatcher<{ select: Appointment }>();
</script>

{#if appointments.length === 0}
  <div class="timeline-empty">No appointments on this schedule.</div>
{:else}
  <div class="timeline">
    {#each appointments as appointment, index}
      <button
        class="entry"
        style={`animation-delay: ${index * 90}ms`}
        type="button"
        disabled={!interactive}
        on:click={() => dispatch('select', appointment)}
      >
        <div class="entry__time">
          <strong>{formatTime(appointment.scheduled_at)}</strong>
          <span>{appointment.treatment.duration_minutes} min</span>
        </div>
        <div class="entry__body">
          <div class="entry__topline">
            <div>
              <h3>{appointment.pet.name}</h3>
              <p>{appointment.treatment.name} for {appointment.pet.owner_name}</p>
            </div>
            <StatusPill status={appointment.status} />
          </div>
          {#if appointment.notes}
            <p class="notes">{appointment.notes}</p>
          {/if}
        </div>
      </button>
    {/each}
  </div>
{/if}

<style>
  .timeline {
    display: grid;
    gap: 0.9rem;
  }

  .entry {
    display: grid;
    grid-template-columns: 7rem 1fr;
    gap: 1rem;
    width: 100%;
    padding: 1rem;
    border: 1px solid rgba(32, 78, 73, 0.09);
    border-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.76);
    text-align: left;
    animation: rise 450ms ease both;
    cursor: pointer;
  }

  .entry:hover {
    transform: translateY(-2px);
    border-color: rgba(214, 139, 100, 0.4);
    box-shadow: 0 14px 28px rgba(32, 78, 73, 0.08);
  }

  .entry:disabled {
    cursor: default;
    opacity: 1;
  }

  .entry:disabled:hover {
    transform: none;
    border-color: rgba(32, 78, 73, 0.09);
    box-shadow: none;
  }

  .entry__time {
    display: grid;
    gap: 0.2rem;
    align-content: start;
    color: var(--muted);
  }

  .entry__time strong {
    color: var(--ink-strong);
    font-size: 1rem;
  }

  .entry__body {
    display: grid;
    gap: 0.55rem;
  }

  .entry__topline {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .entry__topline h3,
  .entry__topline p,
  .notes {
    margin: 0;
  }

  .entry__topline h3 {
    font-size: 1.05rem;
  }

  .entry__topline p,
  .notes,
  .timeline-empty {
    color: var(--muted);
    line-height: 1.5;
  }

  .timeline-empty {
    padding: 1rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.6);
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 720px) {
    .entry {
      grid-template-columns: 1fr;
    }
  }
</style>
