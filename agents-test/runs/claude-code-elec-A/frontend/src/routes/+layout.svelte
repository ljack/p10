<script lang="ts">
  import '../app.css';
  import NavBar from '$lib/components/NavBar.svelte';

  let { children } = $props();
</script>

<NavBar />
<main>
  {@render children()}
</main>

<style>
  main {
    min-height: calc(100vh - 56px);
  }
</style>
