<script lang="ts">
  export let title = '';
  export let subtitle = '';
</script>

<section class="panel">
  {#if title || subtitle}
    <header class="panel__header">
      <div>
        {#if title}
          <h2>{title}</h2>
        {/if}
        {#if subtitle}
          <p>{subtitle}</p>
        {/if}
      </div>
      <slot name="header" />
    </header>
  {/if}

  <slot />
</section>

<style>
  .panel {
    padding: 1.3rem;
    border: 1px solid rgba(32, 78, 73, 0.11);
    border-radius: 1.5rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 248, 242, 0.9)),
      rgba(255, 255, 255, 0.9);
    box-shadow: 0 14px 40px rgba(32, 78, 73, 0.08);
    backdrop-filter: blur(12px);
  }

  .panel__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .panel__header h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.3rem;
  }

  .panel__header p {
    margin: 0.35rem 0 0;
    color: var(--muted);
    line-height: 1.5;
  }
</style>
