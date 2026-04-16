<script lang="ts">
  import type { AppointmentStatus } from '$lib/types';
  import { titleCase } from '$lib/utils';

  export let status: AppointmentStatus;
</script>

<span class={`pill pill--${status}`}>{titleCase(status)}</span>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.34rem 0.7rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .pill--scheduled {
    background: rgba(145, 184, 167, 0.2);
    color: #23514e;
  }

  .pill--in-progress {
    background: rgba(246, 213, 115, 0.25);
    color: #8a6712;
  }

  .pill--completed {
    background: rgba(82, 127, 169, 0.18);
    color: #315070;
  }

  .pill--cancelled {
    background: rgba(184, 110, 103, 0.18);
    color: #874d47;
  }
</style>
