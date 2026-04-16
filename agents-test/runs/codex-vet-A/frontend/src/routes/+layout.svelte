<script lang="ts">
  import { page } from '$app/stores';

  const navItems = [
    { href: '/', label: 'Dashboard', short: 'Home' },
    { href: '/pets', label: 'Pets', short: 'Pets' },
    { href: '/treatments', label: 'Treatments', short: 'Care' },
    { href: '/appointments', label: 'Appointments', short: 'Visits' },
    { href: '/book', label: 'Book Visit', short: 'Book' }
  ];

  function isActive(path: string, href: string): boolean {
    return href === '/' ? path === '/' : path.startsWith(href);
  }
</script>

<svelte:head>
  <title>Vet Appointment App</title>
  <meta
    name="description"
    content="Schedule and manage veterinary appointments, pets, and treatments."
  />
</svelte:head>

<div class="chrome">
  <div class="glow glow--one"></div>
  <div class="glow glow--two"></div>

  <aside class="sidebar">
    <a class="brand" href="/">
      <span class="brand__mark">VA</span>
      <div>
        <strong>Willow Creek Vet</strong>
        <small>Appointments and care planning</small>
      </div>
    </a>

    <nav>
      {#each navItems as item}
        <a class:active={isActive($page.url.pathname, item.href)} href={item.href}>
          <span>{item.label}</span>
          <small>{item.short}</small>
        </a>
      {/each}
    </nav>

    <section class="sidebar-card">
      <p>Clinic hours</p>
      <strong>Mon-Fri · 08:00-17:00</strong>
      <span>Slots open automatically when appointments are cancelled.</span>
    </section>
  </aside>

  <main class="content">
    <slot />
  </main>
</div>

<style>
  :global(:root) {
    --bg: #f7f1e8;
    --surface: rgba(255, 255, 255, 0.78);
    --ink-strong: #1d2c2a;
    --ink: #284341;
    --muted: #5d7471;
    --accent: #d68b64;
    --accent-soft: #f5d0bd;
    --accent-strong: #b96439;
    --sage: #91b8a7;
    --border: rgba(32, 78, 73, 0.12);
    --font-display: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
    --font-body: "Segoe UI", "Helvetica Neue", sans-serif;
  }

  :global(html) {
    background:
      radial-gradient(circle at top left, rgba(214, 139, 100, 0.12), transparent 30%),
      radial-gradient(circle at right 20%, rgba(145, 184, 167, 0.16), transparent 24%),
      linear-gradient(180deg, #fbf5ee 0%, #f5ede1 100%);
    color: var(--ink);
    font-family: var(--font-body);
  }

  :global(body) {
    margin: 0;
    min-height: 100vh;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(a) {
    color: inherit;
  }

  :global(button),
  :global(input),
  :global(select),
  :global(textarea) {
    font: inherit;
  }

  :global(input),
  :global(select),
  :global(textarea) {
    width: 100%;
    padding: 0.85rem 0.95rem;
    border: 1px solid rgba(32, 78, 73, 0.15);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.85);
    color: var(--ink-strong);
  }

  :global(input:focus),
  :global(select:focus),
  :global(textarea:focus) {
    outline: 2px solid rgba(214, 139, 100, 0.24);
    border-color: rgba(214, 139, 100, 0.45);
  }

  :global(button) {
    border: 0;
  }

  :global(.button),
  :global(button[type='submit']),
  :global(button.primary) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem 1.2rem;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--accent), var(--accent-soft));
    color: var(--ink-strong);
    cursor: pointer;
    font-weight: 700;
    text-decoration: none;
  }

  :global(button.secondary),
  :global(.button.secondary) {
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(32, 78, 73, 0.1);
  }

  :global(button.ghost),
  :global(.button.ghost) {
    padding-inline: 0;
    border-radius: 0;
    background: transparent;
    color: var(--accent-strong);
  }

  :global(label) {
    display: grid;
    gap: 0.45rem;
    color: var(--ink-strong);
    font-size: 0.95rem;
    font-weight: 600;
  }

  :global(textarea) {
    min-height: 7rem;
    resize: vertical;
  }

  :global(.grid-two) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  :global(.stack) {
    display: grid;
    gap: 1rem;
  }

  :global(.banner) {
    padding: 0.85rem 1rem;
    border-radius: 1rem;
    font-weight: 600;
  }

  :global(.banner.error) {
    background: rgba(184, 110, 103, 0.14);
    color: #7b413b;
  }

  :global(.banner.success) {
    background: rgba(145, 184, 167, 0.17);
    color: #28554a;
  }

  .chrome {
    position: relative;
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 1.5rem;
    min-height: 100vh;
    padding: 1.5rem;
  }

  .glow {
    position: fixed;
    z-index: 0;
    width: 28rem;
    height: 28rem;
    border-radius: 999px;
    filter: blur(36px);
    opacity: 0.5;
    pointer-events: none;
  }

  .glow--one {
    top: -6rem;
    right: -5rem;
    background: rgba(214, 139, 100, 0.2);
  }

  .glow--two {
    bottom: -10rem;
    left: 15rem;
    background: rgba(145, 184, 167, 0.18);
  }

  .sidebar,
  .content {
    position: relative;
    z-index: 1;
  }

  .sidebar {
    display: grid;
    align-content: start;
    gap: 1.4rem;
    padding: 1.1rem;
    border: 1px solid rgba(32, 78, 73, 0.11);
    border-radius: 1.8rem;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 248, 242, 0.88));
    box-shadow: 0 18px 42px rgba(32, 78, 73, 0.08);
    backdrop-filter: blur(16px);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    text-decoration: none;
  }

  .brand strong {
    display: block;
    font-family: var(--font-display);
    font-size: 1.15rem;
  }

  .brand small {
    color: var(--muted);
  }

  .brand__mark {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, rgba(214, 139, 100, 0.95), rgba(145, 184, 167, 0.92));
    color: white;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  nav {
    display: grid;
    gap: 0.55rem;
  }

  nav a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.95rem 1rem;
    border-radius: 1rem;
    text-decoration: none;
    color: var(--muted);
    transition:
      transform 180ms ease,
      background 180ms ease,
      color 180ms ease;
  }

  nav a:hover,
  nav a.active {
    transform: translateX(4px);
    background: rgba(255, 255, 255, 0.88);
    color: var(--ink-strong);
  }

  nav small {
    color: rgba(93, 116, 113, 0.6);
    font-size: 0.76rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .sidebar-card {
    display: grid;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 1.25rem;
    background: linear-gradient(160deg, rgba(40, 67, 65, 0.95), rgba(56, 91, 87, 0.86));
    color: rgba(255, 255, 255, 0.92);
  }

  .sidebar-card p,
  .sidebar-card strong,
  .sidebar-card span {
    margin: 0;
  }

  .sidebar-card span {
    color: rgba(255, 255, 255, 0.68);
    line-height: 1.5;
  }

  .content {
    padding: 0.5rem 0 2rem;
  }

  :global(.page) {
    display: grid;
    gap: 1.4rem;
    animation: page-enter 500ms ease both;
  }

  @keyframes page-enter {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 980px) {
    .chrome {
      grid-template-columns: 1fr;
    }

    .sidebar {
      grid-template-columns: 1fr;
    }

    nav {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    nav a {
      flex-direction: column;
      align-items: flex-start;
      min-height: 4.5rem;
    }
  }

  @media (max-width: 720px) {
    .chrome {
      padding: 1rem;
    }

    nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    :global(.grid-two) {
      grid-template-columns: 1fr;
    }
  }
</style>
