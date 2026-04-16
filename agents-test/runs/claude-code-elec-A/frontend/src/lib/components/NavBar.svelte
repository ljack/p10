<script lang="ts">
  import { page } from '$app/state';

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/devices', label: 'Devices' },
    { href: '/consumption', label: 'Consumption' },
    { href: '/schedules', label: 'Schedules' },
    { href: '/budget', label: 'Budget' }
  ];

  function isActive(href: string): boolean {
    const path = page.url.pathname;
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }
</script>

<nav class="navbar">
  <div class="navbar-inner">
    <a href="/" class="brand">
      <span class="brand-icon">&#9889;</span>
      <span class="brand-text">ElecTrack</span>
    </a>
    <div class="nav-links">
      {#each links as link}
        <a
          href={link.href}
          class="nav-link"
          class:active={isActive(link.href)}
        >
          {link.label}
        </a>
      {/each}
    </div>
  </div>
</nav>

<style>
  .navbar {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
  }
  .navbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    height: 56px;
    gap: 2rem;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text);
    font-weight: 700;
    font-size: 1.1rem;
    text-decoration: none;
    flex-shrink: 0;
  }
  .brand-icon {
    font-size: 1.3rem;
  }
  .nav-links {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
  }
  .nav-link {
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .nav-link:hover {
    color: var(--text);
    background: var(--bg-hover);
  }
  .nav-link.active {
    color: var(--accent);
    background: rgba(59, 130, 246, 0.1);
  }

  @media (max-width: 480px) {
    .navbar-inner {
      padding: 0 1rem;
      gap: 1rem;
    }
    .brand-text {
      display: none;
    }
    .nav-link {
      padding: 0.35rem 0.6rem;
      font-size: 0.8rem;
    }
  }
</style>
