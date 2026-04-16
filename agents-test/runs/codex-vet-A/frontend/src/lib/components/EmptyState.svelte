<script lang="ts">
  export let title = 'Nothing here yet';
  export let message = 'Add some data to get started.';
</script>

<div class="empty-state">
  <div class="spark" />
  <h3>{title}</h3>
  <p>{message}</p>
</div>

<style>
  .empty-state {
    display: grid;
    gap: 0.75rem;
    place-items: center;
    padding: 2rem 1rem;
    border: 1px dashed rgba(32, 78, 73, 0.18);
    border-radius: 1.4rem;
    text-align: center;
    color: var(--muted);
  }

  .spark {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 1.2rem;
    background:
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.7), transparent 35%),
      linear-gradient(135deg, rgba(214, 139, 100, 0.8), rgba(145, 184, 167, 0.75));
    box-shadow: 0 14px 32px rgba(32, 78, 73, 0.13);
  }

  h3,
  p {
    margin: 0;
  }
</style>
