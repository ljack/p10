<script lang="ts">
  import '../app.css';
</script>

<nav>
  <a href="/">Dashboard</a>
  <a href="/pets">Pets</a>
  <a href="/treatments">Treatments</a>
  <a href="/appointments">Appointments</a>
  <a href="/book">Book Appointment</a>
</nav>

<div class="container">
  <slot />
</div>
