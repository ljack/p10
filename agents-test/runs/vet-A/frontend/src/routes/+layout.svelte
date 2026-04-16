<script lang="ts">
    import { page } from '$app/stores';
    
    let links = [
        { href: '/', label: 'Dashboard' },
        { href: '/pets', label: 'Pets' },
        { href: '/treatments', label: 'Treatments' },
        { href: '/appointments', label: 'Appointments' },
        { href: '/book', label: 'Book Appointment' }
    ];
</script>

<div class="app">
    <nav>
        <h1>🏥 Vet Clinic</h1>
        <ul>
            {#each links as link}
                <li>
                    <a href={link.href} class:active={$page.url.pathname === link.href}>
                        {link.label}
                    </a>
                </li>
            {/each}
        </ul>
    </nav>
    
    <main>
        <slot />
    </main>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: #f5f5f5;
    }
    
    :global(*) {
        box-sizing: border-box;
    }
    
    .app {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }
    
    nav {
        background: #2c3e50;
        color: white;
        padding: 1rem 2rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    nav h1 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
    }
    
    nav ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        gap: 1rem;
    }
    
    nav a {
        color: white;
        text-decoration: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        transition: background 0.2s;
    }
    
    nav a:hover {
        background: rgba(255,255,255,0.1);
    }
    
    nav a.active {
        background: #3498db;
    }
    
    main {
        flex: 1;
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
    }
    
    :global(.card) {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 1rem;
    }
    
    :global(.btn) {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        transition: opacity 0.2s;
    }
    
    :global(.btn:hover) {
        opacity: 0.8;
    }
    
    :global(.btn-primary) {
        background: #3498db;
        color: white;
    }
    
    :global(.btn-danger) {
        background: #e74c3c;
        color: white;
    }
    
    :global(.btn-success) {
        background: #2ecc71;
        color: white;
    }
    
    :global(input, select, textarea) {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
        margin-bottom: 0.5rem;
    }
    
    :global(label) {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 500;
    }
    
    :global(.form-group) {
        margin-bottom: 1rem;
    }
    
    :global(table) {
        width: 100%;
        border-collapse: collapse;
    }
    
    :global(th, td) {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    
    :global(th) {
        background: #f8f9fa;
        font-weight: 600;
    }
    
    :global(.error) {
        color: #e74c3c;
        margin: 1rem 0;
        padding: 1rem;
        background: #fee;
        border-radius: 4px;
    }
    
    :global(.success) {
        color: #27ae60;
        margin: 1rem 0;
        padding: 1rem;
        background: #d5f4e6;
        border-radius: 4px;
    }
</style>
