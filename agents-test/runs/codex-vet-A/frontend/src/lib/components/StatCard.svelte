<script lang="ts">
  export let label = '';
  export let value = '';
  export let hint = '';
  export let tone: 'sage' | 'sun' | 'clay' = 'sage';
</script>

<article class={`stat stat--${tone}`}>
  <p>{label}</p>
  <strong>{value}</strong>
  {#if hint}
    <span>{hint}</span>
  {/if}
</article>

<style>
  .stat {
    position: relative;
    overflow: hidden;
    padding: 1.3rem;
    border-radius: 1.4rem;
    color: var(--ink-strong);
  }

  .stat::after {
    content: '';
    position: absolute;
    inset: auto -1rem -2rem auto;
    width: 6rem;
    height: 6rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.32);
  }

  .stat p,
  .stat span {
    position: relative;
    z-index: 1;
  }

  .stat p {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .stat strong {
    position: relative;
    z-index: 1;
    display: block;
    margin-top: 0.55rem;
    font-family: var(--font-display);
    font-size: 2.2rem;
    line-height: 1;
  }

  .stat span {
    display: block;
    margin-top: 0.6rem;
    color: rgba(29, 44, 42, 0.82);
  }

  .stat--sage {
    background: linear-gradient(135deg, rgba(145, 184, 167, 0.85), rgba(219, 237, 224, 0.92));
  }

  .stat--sun {
    background: linear-gradient(135deg, rgba(246, 213, 115, 0.84), rgba(255, 240, 197, 0.92));
  }

  .stat--clay {
    background: linear-gradient(135deg, rgba(214, 139, 100, 0.82), rgba(250, 220, 203, 0.92));
  }
</style>
