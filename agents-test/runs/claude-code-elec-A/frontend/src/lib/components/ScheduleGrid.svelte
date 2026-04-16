<script lang="ts">
  import type { Schedule } from '$lib/types';

  let { schedules = [], onToggle, onEdit, onDelete }: {
    schedules: Schedule[];
    onToggle?: (s: Schedule) => void;
    onEdit?: (s: Schedule) => void;
    onDelete?: (s: Schedule) => void;
  } = $props();

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const typeColors: Record<string, string> = {
    lighting: '#fef08a',
    heating: '#fca5a5',
    cooling: '#93c5fd',
    appliance: '#86efac',
    electronics: '#c4b5fd',
    other: '#d4d4d8'
  };

  let byDay = $derived(
    dayNames.map((_, i) =>
      schedules.filter(s => s.day_of_week === i)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    )
  );
</script>

<div class="schedule-grid">
  {#each dayNames as day, dayIndex}
    <div class="day-column">
      <div class="day-header">{day}</div>
      <div class="day-entries">
        {#each byDay[dayIndex] as schedule}
          <div
            class="schedule-entry"
            class:disabled={!schedule.enabled}
            style="border-left-color: {typeColors[schedule.device_name ? '' : 'other'] ?? 'var(--accent)'}"
          >
            <div class="entry-time">
              {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
            </div>
            <div class="entry-device">{schedule.device_name ?? `Device #${schedule.device_id}`}</div>
            <div class="entry-actions">
              {#if onToggle}
                <label class="toggle">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onchange={() => onToggle?.(schedule)}
                  />
                  <span class="slider"></span>
                </label>
              {/if}
              {#if onEdit}
                <button class="btn-icon btn-sm" onclick={() => onEdit?.(schedule)} title="Edit">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              {/if}
              {#if onDelete}
                <button class="btn-icon btn-sm" onclick={() => onDelete?.(schedule)} title="Delete">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {:else}
          <div class="no-entries">--</div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .schedule-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.5rem;
    overflow-x: auto;
    min-width: 0;
  }
  .day-column {
    min-width: 120px;
  }
  .day-header {
    text-align: center;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    padding: 0.5rem;
    background: var(--bg-hover);
    border-radius: 8px 8px 0 0;
  }
  .day-entries {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.35rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 8px 8px;
    min-height: 80px;
  }
  .schedule-entry {
    padding: 0.4rem 0.5rem;
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    background: var(--bg);
    font-size: 0.78rem;
    transition: opacity 0.2s;
  }
  .schedule-entry.disabled {
    opacity: 0.4;
  }
  .entry-time {
    font-weight: 600;
    color: var(--accent);
    font-size: 0.72rem;
  }
  .entry-device {
    margin-top: 0.1rem;
    color: var(--text);
  }
  .entry-actions {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.3rem;
  }
  .no-entries {
    color: var(--text-muted);
    font-size: 0.75rem;
    text-align: center;
    padding: 1rem 0;
  }

  @media (max-width: 768px) {
    .schedule-grid {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }
  }
</style>
