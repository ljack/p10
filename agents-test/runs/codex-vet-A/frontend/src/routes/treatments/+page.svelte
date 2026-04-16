<script lang="ts">
  import { onMount } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import { api } from '$lib/api';
  import type { Treatment, TreatmentPayload } from '$lib/types';
  import { formatCurrency } from '$lib/utils';

  type TreatmentForm = {
    name: string;
    duration_minutes: number;
    description: string;
    price: number;
  };

  function emptyForm(): TreatmentForm {
    return {
      name: '',
      duration_minutes: 30,
      description: '',
      price: 50
    };
  }

  let treatments: Treatment[] = [];
  let form = emptyForm();
  let editingId: number | null = null;
  let loading = true;
  let saving = false;
  let errorMessage = '';
  let successMessage = '';

  async function loadTreatments(): Promise<void> {
    loading = true;
    errorMessage = '';

    try {
      treatments = await api.listTreatments();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to load treatments.';
    } finally {
      loading = false;
    }
  }

  function resetForm(): void {
    form = emptyForm();
    editingId = null;
  }

  function selectTreatment(treatment: Treatment): void {
    editingId = treatment.id;
    form = {
      name: treatment.name,
      duration_minutes: treatment.duration_minutes,
      description: treatment.description ?? '',
      price: treatment.price
    };
  }

  function buildPayload(): TreatmentPayload {
    return {
      name: form.name.trim(),
      duration_minutes: Number(form.duration_minutes),
      description: form.description.trim() || null,
      price: Number(form.price)
    };
  }

  async function saveTreatment(): Promise<void> {
    saving = true;
    errorMessage = '';
    successMessage = '';

    try {
      const payload = buildPayload();
      if (editingId) {
        await api.updateTreatment(editingId, payload);
        successMessage = 'Treatment updated.';
      } else {
        await api.createTreatment(payload);
        successMessage = 'Treatment added.';
      }

      resetForm();
      await loadTreatments();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to save the treatment.';
    } finally {
      saving = false;
    }
  }

  async function removeTreatment(treatment: Treatment): Promise<void> {
    if (!window.confirm(`Delete ${treatment.name}?`)) {
      return;
    }

    errorMessage = '';
    successMessage = '';

    try {
      await api.deleteTreatment(treatment.id);
      if (editingId === treatment.id) {
        resetForm();
      }
      successMessage = 'Treatment removed.';
      await loadTreatments();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to delete the treatment.';
    }
  }

  onMount(() => {
    void loadTreatments();
  });
</script>

<div class="page">
  <PageHeader
    eyebrow="Services"
    title="Treatments"
    description="Manage the care menu, expected duration, and pricing so bookings stay accurate."
  />

  {#if errorMessage}
    <div class="banner error">{errorMessage}</div>
  {/if}

  {#if successMessage}
    <div class="banner success">{successMessage}</div>
  {/if}

  <div class="split">
    <Panel title="Current treatments" subtitle="Seeded on first run and ready to extend">
      {#if loading}
        <p class="muted">Loading treatments...</p>
      {:else if treatments.length === 0}
        <EmptyState
          title="No treatments configured"
          message="Add care options so appointments can be booked."
        />
      {:else}
        <div class="treatment-list">
          {#each treatments as treatment}
            <article class="treatment-card">
              <div class="treatment-card__header">
                <div>
                  <h3>{treatment.name}</h3>
                  <p>{treatment.duration_minutes} minutes</p>
                </div>
                <strong>{formatCurrency(treatment.price)}</strong>
              </div>

              {#if treatment.description}
                <p class="description">{treatment.description}</p>
              {/if}

              <div class="actions">
                <button type="button" class="secondary" on:click={() => selectTreatment(treatment)}>
                  Edit
                </button>
                <button type="button" class="ghost" on:click={() => removeTreatment(treatment)}>
                  Delete
                </button>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </Panel>

    <Panel
      title={editingId ? 'Edit treatment' : 'Add a treatment'}
      subtitle="Duration and price power the slot checker and booking flow."
    >
      <form class="stack" on:submit|preventDefault={saveTreatment}>
        <label>
          Treatment name
          <input bind:value={form.name} required />
        </label>

        <div class="grid-two">
          <label>
            Duration in minutes
            <input bind:value={form.duration_minutes} type="number" min="15" max="480" step="5" />
          </label>
          <label>
            Price
            <input bind:value={form.price} type="number" min="1" step="0.01" />
          </label>
        </div>

        <label>
          Description
          <textarea bind:value={form.description} placeholder="What happens during this treatment?" />
        </label>

        <div class="actions">
          <button type="submit" disabled={saving}>
            {editingId ? 'Save changes' : 'Create treatment'}
          </button>
          <button type="button" class="secondary" on:click={resetForm}>Reset</button>
        </div>
      </form>
    </Panel>
  </div>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 1rem;
  }

  .treatment-list,
  .treatment-card {
    display: grid;
    gap: 1rem;
  }

  .treatment-card {
    padding: 1rem;
    border-radius: 1.2rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .treatment-card__header,
  .actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .treatment-card h3,
  .treatment-card p,
  .treatment-card strong {
    margin: 0;
  }

  .description,
  .muted {
    margin: 0;
    color: var(--muted);
    line-height: 1.5;
  }

  .actions {
    align-items: center;
    flex-wrap: wrap;
  }

  @media (max-width: 960px) {
    .split {
      grid-template-columns: 1fr;
    }
  }
</style>
