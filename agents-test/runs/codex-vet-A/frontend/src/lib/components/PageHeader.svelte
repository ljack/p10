<script lang="ts">
  export let eyebrow = '';
  export let title = '';
  export let description = '';
  export let actionHref = '';
  export let actionLabel = '';
</script>

<header class="page-header">
  <div class="copy">
    {#if eyebrow}
      <p class="eyebrow">{eyebrow}</p>
    {/if}
    <h1>{title}</h1>
    {#if description}
      <p class="description">{description}</p>
    {/if}
  </div>

  {#if actionHref && actionLabel}
    <a class="action" href={actionHref}>{actionLabel}</a>
  {/if}

  <slot name="action" />
</header>

<style>
  .page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .copy h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(2rem, 3vw, 3.2rem);
    letter-spacing: -0.03em;
  }

  .eyebrow {
    margin: 0 0 0.3rem;
    color: var(--accent-strong);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .description {
    margin: 0.6rem 0 0;
    max-width: 40rem;
    color: var(--muted);
    line-height: 1.6;
  }

  .action {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1.2rem;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--accent), var(--accent-soft));
    color: var(--ink-strong);
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 18px 35px rgba(214, 139, 100, 0.24);
  }

  @media (max-width: 720px) {
    .page-header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
